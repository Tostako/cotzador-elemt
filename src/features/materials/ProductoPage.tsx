import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../shared/hooks/useNotifications';
import type { QuoteCatalogProduct, QuoteCatalogPrice } from '../../shared/types';

export function ProductoPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const showNotification = useAppStore((s) => s.showNotification);
  const [product, setProduct] = useState<QuoteCatalogProduct | null>(null);
  const [prices, setPrices] = useState<QuoteCatalogPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [newPrice, setNewPrice] = useState({ hardware_store: '', brand: '', price: '', notes: '' });
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const res = await apiService.getCatalogProduct(productId!);
      const data = extractData(res);
      if (data) {
        setProduct(data);
        const priceList = data.prices || [];
        setPrices(priceList.sort((a: QuoteCatalogPrice, b: QuoteCatalogPrice) => a.price - b.price));
      }
    } catch (err: any) {
      showNotification(err.message || 'Error al cargar producto', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPrice = async () => {
    if (!newPrice.hardware_store.trim() || !newPrice.brand.trim() || !newPrice.price) {
      showNotification('Ferretería, marca y precio son obligatorios', 'warning');
      return;
    }
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.addCatalogPrice(productId!, {
        hardware_store: newPrice.hardware_store.trim(),
        brand: newPrice.brand.trim(),
        price: parseFloat(newPrice.price),
        notes: newPrice.notes.trim() || undefined,
      });
      showNotification('Precio agregado', 'success');
      setNewPrice({ hardware_store: '', brand: '', price: '', notes: '' });
      setShowPriceForm(false);
      loadProduct();
    } catch (err: any) {
      showNotification(err.message || 'Error al agregar precio', 'error');
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (!confirm('¿Eliminar este precio?')) return;
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.deleteCatalogPrice(productId!, priceId);
      showNotification('Precio eliminado', 'success');
      loadProduct();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar', 'error');
    }
  };

  const handleOrder = async (price: QuoteCatalogPrice) => {
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.createCatalogOrder({
        notes: `Pedido de ${product?.name}`,
        items: [
          {
            product_id: productId,
            price_id: price.id,
            quantity: quantity,
          },
        ],
      });
      showNotification('Agregado a pedidos', 'success');
      navigate('/materiales/pedidos');
    } catch (err: any) {
      showNotification(err.message || 'Error al crear pedido', 'error');
    }
  };

  return (
    <main>
      <button className="btn btn-ghost btn-small mb-2" onClick={() => navigate(-1)}>
        ← Volver
      </button>

      {isLoading ? (
        <p className="small" style={{ color: '#999' }}>Cargando...</p>
      ) : !product ? (
        <p className="small" style={{ color: '#999' }}>Producto no encontrado</p>
      ) : (
        <>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{product.name}</h1>
          {product.description && <p className="small" style={{ color: '#999', marginBottom: 16 }}>{product.description}</p>}

          <div className="card mt-2" style={{ marginBottom: 24 }}>
            <div className="flex-between mb-2">
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>💰 Precios por Ferretería</h3>
              <button className="btn btn-small" onClick={() => setShowPriceForm(!showPriceForm)}>
                {showPriceForm ? '× Cancelar' : '+ Agregar Precio'}
              </button>
            </div>

            {showPriceForm && (
              <div className="inline-form">
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: 4 }}>Ferretería</label>
                    <input className="input" value={newPrice.hardware_store} onChange={(e) => setNewPrice({ ...newPrice, hardware_store: e.target.value })} placeholder="Ej: Homecenter" />
                  </div>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: 4 }}>Marca</label>
                    <input className="input" value={newPrice.brand} onChange={(e) => setNewPrice({ ...newPrice, brand: e.target.value })} placeholder="Ej: Truper" />
                  </div>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: 4 }}>Precio</label>
                    <input className="input" type="number" value={newPrice.price} onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })} placeholder="Ej: 23000" />
                  </div>
                  <div>
                    <label className="small" style={{ display: 'block', marginBottom: 4 }}>Notas <span style={{ opacity: 0.5 }}>(opcional)</span></label>
                    <input className="input" value={newPrice.notes} onChange={(e) => setNewPrice({ ...newPrice, notes: e.target.value })} placeholder="Ej: Disponible" />
                  </div>
                  <div className="grid-2">
                    <button className="btn btn-secondary" onClick={() => setShowPriceForm(false)}>Cancelar</button>
                    <button className="btn" onClick={handleAddPrice}>Agregar</button>
                  </div>
                </div>
              </div>
            )}

            {prices.length === 0 ? (
              <p className="small" style={{ color: '#999' }}>No hay precios registrados.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {prices.map((price, index) => (
                  <div
                    key={price.id}
                    className="card"
                    style={{
                      border: index === 0 ? '1px solid #b69462' : '1px solid transparent',
                      background: index === 0 ? 'rgba(182,148,98,0.05)' : undefined,
                    }}
                  >
                    <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>
                          {index === 0 && <span style={{ color: '#b69462', marginRight: 8 }}>🏆</span>}
                          {price.hardware_store}
                        </div>
                        <p className="small" style={{ color: '#999' }}>Marca: {price.brand}</p>
                        {price.notes && <p className="small" style={{ color: '#666' }}>{price.notes}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
                          ${price.price.toLocaleString('es-CO')}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <label className="small">Cant:</label>
                            <input
                              type="number"
                              className="input"
                              style={{ width: 60, padding: '6px 8px' }}
                              value={quantity}
                              min={1}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <button
                            className="btn btn-small"
                            onClick={() => handleOrder(price)}
                          >
                            🛒 Pedir
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => handleDeletePrice(price.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
