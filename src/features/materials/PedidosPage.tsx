import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../shared/hooks/useNotifications';
import type { QuoteCatalogOrder } from '../../shared/types';

export function PedidosPage() {
  const navigate = useNavigate();
  const showNotification = useAppStore((s) => s.showNotification);
  const [orders, setOrders] = useState<QuoteCatalogOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { apiService, extractData } = await import('../../shared/services/api');
      const res = await apiService.getCatalogOrders();
      const data = extractData(res);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showNotification(err.message || 'Error al cargar pedidos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <button className="btn btn-ghost btn-small mb-2" onClick={() => navigate('/materiales')}>
        ← Volver a Materiales
      </button>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>🛒 Pedidos</h1>
      <p className="small">Listas de compras de materiales</p>

      {isLoading ? (
        <p className="small" style={{ color: '#999' }}>Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="small" style={{ color: '#999' }}>No hay pedidos. Ve a un producto y haz clic en "Pedir".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex-between mb-2">
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: order.status === 'draft' ? 'rgba(255,149,0,0.15)' : 'rgba(52,199,89,0.15)',
                      color: order.status === 'draft' ? '#ff9500' : '#34c759',
                    }}
                  >
                    {order.status === 'draft' ? 'Borrador' : 'Completado'}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>
                    {order.notes || 'Pedido sin notas'}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#b69462' }}>
                    ${order.total.toLocaleString('es-CO')}
                  </div>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: '#0a0a0a',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</div>
                        <p className="small" style={{ color: '#999' }}>
                          {item.hardware_store} — {item.brand}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="small" style={{ color: '#b69462' }}>
                          ${item.unit_price.toLocaleString('es-CO')} x {item.quantity}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          ${item.subtotal.toLocaleString('es-CO')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
