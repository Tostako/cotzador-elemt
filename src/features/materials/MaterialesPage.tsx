import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../shared/hooks/useNotifications';
import type { QuoteCatalogCategory } from '../../shared/types';

export function MaterialesPage() {
  const navigate = useNavigate();
  const showNotification = useAppStore((s) => s.showNotification);
  const [categories, setCategories] = useState<QuoteCatalogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const res = await apiService.getCatalogCategories();
      const data = extractData(res);
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showNotification(err.message || 'Error al cargar categorías', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategory.name.trim()) {
      showNotification('El nombre es obligatorio', 'warning');
      return;
    }
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.createCatalogCategory({
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || undefined,
      });
      showNotification('Categoría creada', 'success');
      setNewCategory({ name: '', description: '' });
      setShowForm(false);
      loadCategories();
    } catch (err: any) {
      showNotification(err.message || 'Error al crear', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.deleteCatalogCategory(id);
      showNotification('Categoría eliminada', 'success');
      loadCategories();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar', 'error');
    }
  };

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>🏗️ Materiales</h1>
      <p className="small">Gestiona tus categorías y productos de materiales</p>

      <button className="btn mt-2 mb-2" onClick={() => setShowForm(!showForm)}>
        {showForm ? '× Cancelar' : '+ Nueva Categoría'}
      </button>

      {showForm && (
        <div className="inline-form">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Nueva Categoría</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
              <input className="input" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Descripción <span style={{ opacity: 0.5 }}>(opcional)</span></label>
              <input className="input" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
            </div>
            <div className="grid-2">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn" onClick={handleCreate}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="small" style={{ color: '#999' }}>Cargando...</p>
      ) : categories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>No hay categorías. Crea la primera para empezar.</p>
        </div>
      ) : (
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="card"
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/materiales/${cat.id}`)}
            >
              <div className="flex-between mb-1">
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>{cat.name}</h3>
                <button
                  className="btn btn-small btn-danger"
                  onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                >
                  🗑️
                </button>
              </div>
              {cat.description && <p className="small" style={{ color: '#999' }}>{cat.description}</p>}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>📁</span>
                <span className="small" style={{ color: '#b69462' }}>Ver productos →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
