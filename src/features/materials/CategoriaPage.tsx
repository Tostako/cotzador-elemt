import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { showNotification } from '../../shared/hooks/useNotifications';
import type { QuoteCatalogProduct, QuoteCatalogCategory } from '../../shared/types';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

export function CategoriaPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams();

  const [category, setCategory] = useState<QuoteCatalogCategory | null>(null);
  const [products, setProducts] = useState<QuoteCatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '' });

  useEffect(() => {
    if (categoryId) {
      loadCategoryAndProducts();
    }
  }, [categoryId]);

  const loadCategoryAndProducts = async () => {
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const [catRes, prodRes] = await Promise.all([
        apiService.getCatalogCategories().catch(() => null),
        apiService.getCatalogProducts(categoryId).catch(() => null),
      ]);
      const cats = extractData(catRes);
      const prods = extractData(prodRes);
      if (Array.isArray(cats)) {
        setCategory(cats.find((c: QuoteCatalogCategory) => c.id === categoryId) || null);
      }
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProduct.name.trim()) {
      showNotification('Atención', 'warning', 'El nombre es obligatorio.');
      return;
    }
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.createCatalogProduct({
        category_id: categoryId,
        name: newProduct.name.trim(),
        description: newProduct.description.trim() || undefined,
      });
      showNotification('Correcto', 'success', 'Producto creado correctamente.');
      setNewProduct({ name: '', description: '' });
      setShowForm(false);
      loadCategoryAndProducts();
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'Error al crear');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.deleteCatalogProduct(id);
      showNotification('Correcto', 'success', 'Producto eliminado correctamente.');
      loadCategoryAndProducts();
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'Error al eliminar');
    }
  };

  return (
    <main>
      <button className="btn btn-ghost btn-small mb-2" onClick={() => navigate('/materiales')} style={{ gap: 6 }}>
        <ArrowLeft size={15} /> Volver a Materiales
      </button>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        {category?.name || 'Productos'}
      </h1>
      {category?.description && <p className="small" style={{ color: '#999', marginBottom: 16 }}>{category.description}</p>}

      <button className="btn mt-2 mb-2" onClick={() => setShowForm(!showForm)}>
        {showForm ? '× Cancelar' : '+ Nuevo Producto'}
      </button>

      {showForm && (
        <div className="inline-form">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Nuevo Producto</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre</label>
              <input className="input" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Descripción <span style={{ opacity: 0.5 }}>(opcional)</span></label>
              <input className="input" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
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
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>No hay productos en esta categoría.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {products.map((prod) => (
            <div
              key={prod.id}
              className="card"
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => navigate(`/materiales/productos/${prod.id}`)}
            >
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{prod.name}</h3>
                {prod.description && <p className="small" style={{ color: '#999' }}>{prod.description}</p>}
                <div style={{ marginTop: 4 }}>
                  <span className="small" style={{ color: '#b69462' }}>
                    {prod.lowest_price ? `$${prod.lowest_price.toLocaleString('es-CO')} COP` : 'Sin precios'}
                  </span>
                  <span className="small" style={{ color: '#666', marginLeft: 8 }}>
                    {prod.prices_count} ferretería{prod.prices_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-small" onClick={(e) => { e.stopPropagation(); navigate(`/materiales/productos/${prod.id}`); }} style={{ gap: 6 }}>
                  Ver <ArrowRight size={14} />
                </button>
                <button className="btn btn-small btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(prod.id); }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
