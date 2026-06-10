import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAppStore, NotificationContainer } from '../../shared/hooks/useNotifications';
import { useStore } from '../../shared/services/store';
import logoAbbreviated from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';

export function RegisterPage() {
  const navigate = useNavigate();
  const showNotification = useAppStore((s) => s.showNotification);
  const login = useStore((s) => s.login);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showNotification('Completa nombre, correo y contraseña', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showNotification('Las contraseñas no coinciden', 'error');
      return;
    }
    if (password.length < 6) {
      showNotification('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const { apiService, SHOP_SLUG } = await import('../../shared/services/api');
      const res = await apiService.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password.trim(),
        shop_slug: SHOP_SLUG,
        address: profession || undefined,
      });
      let token = res.token || (res.data && res.data.token);
      if (!token) {
        throw new Error('El servidor no devolvió un token de sesión');
      }

      // Check if token is pending (no shop_id) and resolve it
      let selectRes: any = null;
      if (apiService.isTokenPending(token)) {
        console.log('[REGISTER] Token is pending, resolving shop...');
        // Save temp token to localStorage so api() can read it for selectShop
        const tempUser = apiService.buildUserFromToken(token);
        if (tempUser) {
          localStorage.setItem('element_user', JSON.stringify(tempUser));
        }
        selectRes = await apiService.selectShop({ shop_slug: SHOP_SLUG });
        const newToken = selectRes.token || (selectRes.data && selectRes.data.token);
        if (newToken) {
          token = newToken;
          console.log('[REGISTER] Shop resolved, new token received');
        }
      }

      let user = apiService.buildUserFromToken(token);
      if (!user) {
        throw new Error('No se pudieron leer los datos del usuario desde el token');
      }
      // Fallback: try response body name, then the form name
      if (!user.name || user.name === 'Usuario') {
        const bodyName =
          selectRes?.user?.name ||
          selectRes?.customer?.name ||
          selectRes?.data?.user?.name ||
          selectRes?.data?.customer?.name ||
          res.name ||
          res.customer_name ||
          res.user?.name ||
          res.customer?.name ||
          res.data?.name ||
          res.data?.customer_name ||
          res.data?.user?.name ||
          res.data?.customer?.name;
        user = { ...user, name: bodyName || name.trim() || 'Usuario' };
      }
      // Extract profession from response if available
      const bodyProfession =
        selectRes?.user?.profession ||
        selectRes?.customer?.profession ||
        selectRes?.data?.user?.profession ||
        selectRes?.data?.customer?.profession ||
        res.user?.profession ||
        res.customer?.profession ||
        res.data?.user?.profession ||
        res.data?.customer?.profession;
      if (bodyProfession) {
        user = { ...user, profession: bodyProfession };
      } else if (profession) {
        user = { ...user, profession };
      }
      login(user);
      showNotification(`¡Bienvenido a ELEMENT, ${user.name}!`, 'success');
      // Activate onboarding tour for new users
      localStorage.removeItem('element_tour_seen');
      localStorage.removeItem('element_tour_active');
      localStorage.removeItem('element_tour_step');
      navigate('/dashboard');
    } catch (err: any) {
      showNotification(err.message || 'Error al registrar usuario', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <NotificationContainer />
      <div className="animated-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Background effects */}
      <div style={{
        position: 'fixed',
        top: '10%',
        left: '5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(182,148,98,0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        bottom: '10%',
        right: '5%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(182,148,98,0.06) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Back to login */}
        <button
          className="btn btn-ghost btn-small"
          style={{ marginBottom: 32 }}
          onClick={() => navigate('/login')}
        >
          ← Volver al inicio de sesión
        </button>

        <div
          className="card-hero"
          style={{
            animation: 'modalSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img 
              src={logoAbbreviated}
              alt="ELEMENThaus"
              style={{
                height: 100,
                width: 'auto',
                filter: 'drop-shadow(0 0 20px rgba(182, 148, 98, 0.3))',
              }} 
            />
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Nombre completo</label>
              <input
                className="input"
                placeholder="Ej: Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Correo electrónico</label>
              <input
                className="input"
                type="email"
                placeholder="Ej: juan@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Teléfono <span style={{ opacity: 0.5 }}>(opcional)</span></label>
              <input
                className="input"
                type="tel"
                placeholder="Ej: +57 300 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Profesión <span style={{ opacity: 0.5 }}>(opcional)</span></label>
              <input
                className="input"
                placeholder="Ej: Arquitecto, Ingeniero, Maestro de Obra..."
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Confirmar contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                  }}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              className="btn"
              onClick={handleRegister}
              disabled={isLoading}
              style={{ marginTop: 8 }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#000',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Creando cuenta...
                </span>
              ) : (
                'CREAR CUENTA'
              )}
            </button>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p className="small" style={{ fontSize: 12 }}>
              ¿Ya tienes cuenta?{' '}
              <span style={{ color: '#b69462', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/login')}>
                Inicia sesión
              </span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}      </style>
    </div>
    </>
  );
}
