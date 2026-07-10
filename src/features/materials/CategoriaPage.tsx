import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { showNotification } from '../../shared/hooks/useNotifications';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useCatalogCategories, useCatalogProducts, useCreateProduct, useDeleteProduct } from '../../shared/queries/catalog';

export function CategoriaPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { data: categories = [] } = useCatalogCategories();
  const { data: products = [], isLoading } = useCatalogProducts(categoryId);
  const createProd = useCreateProduct();
  const deleteProd = useDeleteProduct();
  const category = categories.find((c: any) => c.id === categoryId) || null;
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '' });

  const handleCreate = () => {
    if (!newProduct.name.trim()) {
      showNotification('Atención', 'warning', 'El nombre es obligatorio.');
      return;
    }
    createProd.mutate(
      { category_id: categoryId, name: newProduct.name.trim(), description: newProduct.description.trim() || undefined },
      {
        onSuccess: () => {
          showNotification('Correcto', 'success', 'Producto creado correctamente.');
          setNewProduct({ name: '', description: '' });
          setShowForm(false);
        },
        onError: (err: any) => showNotification('Error', 'error', err?.message || 'Error al crear'),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteProd.mutate(id, {
      onSuccess: () => showNotification('Correcto', 'success', 'Producto eliminado correctamente.'),
      onError: (err: any) => showNotification('Error', 'error', err?.message || 'Error al eliminar'),
    });
  };

  return (
    <main>
      <button type="button" className="btn btn-ghost btn-small mb-2" onClick={() => navigate('/materiales')} style={{ gap: 6 }}>
        <ArrowLeft size={15} /> Volver a Materiales
      </button>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        {category?.name || 'Productos'}
      </h1>
      {category?.description && <p className="small" style={{ color: '#999', marginBottom: 16 }}>{category.description}</p>}

      <button type="button" className="btn mt-2 mb-2" onClick={() => setShowForm(!showForm)}>
        {showForm ? '× Cancelar' : '+ Nuevo Producto'}
      </button>

      {showForm && (
        <div className="inline-form">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Nuevo Producto</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor="productName" className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
              <input id="productName" className="input" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="productDescription" className="small" style={{ display: 'block', marginBottom: 4 }}>Descripción <span style={{ opacity: 0.5 }}>(opcional)</span></label>
              <input id="productDescription" className="input" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
            </div>
            <div className="grid-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="button" className="btn" onClick={handleCreate} disabled={createProd.isPending}>{createProd.isPending ? 'Creando…' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="small" style={{ color: '#999' }}>Cargando...</p>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>No hay productos en esta categoría.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {products.map((prod: any) => (
            <div
              key={prod.id}
              className="card"
              style={{ position: 'relative' }}
            >
              <div className="flex-between mb-1">
                <button
                  type="button"
                  onClick={() => navigate(`/materiales/productos/${prod.id}`)}
                  style={{ border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{prod.name}</h3>
                </button>
                <button type="button" className="btn btn-small btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(prod.id); }}>
                  <Trash2 size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/materiales/productos/${prod.id}`)}
                style={{ border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                {prod.description && <p className="small" style={{ color: '#999' }}>{prod.description}</p>}
                <div style={{ marginTop: 4 }}>
                  <span className="small" style={{ color: '#b69462' }}>
                    {prod.lowest_price ? `$${prod.lowest_price.toLocaleString('es-CO')} COP` : 'Sin precios'}
                  </span>
                  <span className="small" style={{ color: '#666', marginLeft: 8 }}>
                    {prod.prices_count} ferretería{prod.prices_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
