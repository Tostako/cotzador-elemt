import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showNotification } from '../../shared/hooks/useNotifications';
import { BackButton } from '../../shared/components/BackButton';
import { Package, Trash2, FolderOpen, ArrowRight } from 'lucide-react';
import { useCatalogCategories, useCreateCategory, useDeleteCategory } from '../../shared/queries/catalog';

export function MaterialesPage() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useCatalogCategories();
  const createCat = useCreateCategory();
  const deleteCat = useDeleteCategory();
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const handleCreate = () => {
    if (!newCategory.name.trim()) {
      showNotification('Atención', 'warning', 'El nombre es obligatorio.');
      return;
    }
    createCat.mutate(
      { name: newCategory.name.trim(), description: newCategory.description.trim() || undefined },
      {
        onSuccess: () => {
          showNotification('Correcto', 'success', 'Categoría creada correctamente.');
          setNewCategory({ name: '', description: '' });
          setShowForm(false);
        },
        onError: (err: any) => showNotification('Error', 'error', err?.message || 'Error al crear'),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteCat.mutate(id, {
      onSuccess: () => showNotification('Correcto', 'success', 'Categoría eliminada correctamente.'),
      onError: (err: any) => showNotification('Error', 'error', err?.message || 'Error al eliminar'),
    });
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
              <button type="button" className="btn" onClick={handleCreate} disabled={createCat.isPending}>{createCat.isPending ? 'Creando…' : 'Crear'}</button>
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
          {categories.map((cat: any) => (
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
