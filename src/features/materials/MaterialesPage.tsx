import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showNotification } from '../../shared/hooks/useNotifications';
import type { QuoteCatalogCategory } from '../../shared/types';
import { BackButton } from '../../shared/components/BackButton';
import { Package, Trash2, FolderOpen, ArrowRight } from 'lucide-react';

export function MaterialesPage() {
  const navigate = useNavigate();

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
      showNotification('Error', 'error', err.message || 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategory.name.trim()) {
      showNotification('Atención', 'warning', 'El nombre es obligatorio.');
      return;
    }
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.createCatalogCategory({
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || undefined,
      });
      showNotification('Correcto', 'success', 'Categoría creada correctamente.');
      setNewCategory({ name: '', description: '' });
      setShowForm(false);
      loadCategories();
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'Error al crear');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.deleteCatalogCategory(id);
      showNotification('Correcto', 'success', 'Categoría eliminada correctamente.');
      loadCategories();
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'Error al eliminar');
    }
  };

  return (
    <main>
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}><Package size={28} color="#b69462" /> Materiales</h1>
      <p className="small">Gestiona tus categorías y productos de materiales</p>

      <button type="button" className="btn mt-2 mb-2" onClick={() => setShowForm(!showForm)}>
        {showForm ? '× Cancelar' : '+ Nueva Categoría'}
      </button>

      {showForm && (
        <div className="inline-form">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Nueva Categoría</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor="categoryName" className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
              <input id="categoryName" className="input" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="categoryDescription" className="small" style={{ display: 'block', marginBottom: 4 }}>Descripción <span style={{ opacity: 0.5 }}>(opcional)</span></label>
              <input id="categoryDescription" className="input" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
            </div>
            <div className="grid-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="button" className="btn" onClick={handleCreate}>Crear</button>
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
              style={{ position: 'relative' }}
            >
              <div className="flex-between mb-1">
                <button
                  type="button"
                  onClick={() => navigate(`/materiales/${cat.id}`)}
                  style={{ border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 600 }}>{cat.name}</h3>
                </button>
                <button type="button"
                  className="btn btn-small btn-danger"
                  onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/materiales/${cat.id}`)}
                style={{ border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                {cat.description && <p className="small" style={{ color: '#999' }}>{cat.description}</p>}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#b69462' }}>
                  <FolderOpen size={18} />
                  <span className="small" style={{ color: '#b69462', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Ver productos <ArrowRight size={14} /></span>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
