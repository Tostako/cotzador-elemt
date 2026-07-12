import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { showNotification, Toaster } from '../../shared/hooks/useNotifications';
import { useStore } from '../../shared/services/store';
import logoAbbreviated from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showNotification('Atención', 'warning', 'Ingresa tu correo electrónico y contraseña para continuar.');
      return;
    }
    setIsLoading(true);
    try {
      const { apiService, SHOP_SLUG } = await import('../../shared/services/api');
      const res = await apiService.login({ email: email.trim(), password: password.trim(), shop_slug: SHOP_SLUG });
      let token = res.token || res.access_token || (res.data && (res.data.token || res.data.access_token));
      if (!token) {
        throw new Error('El servidor no devolvió un token de sesión');
      }

      // Check if token is pending (no shop_id) and resolve it
      let selectRes: any = null;
      if (apiService.isTokenPending(token)) {
        // Save temp token to localStorage so api() can read it for selectShop
        const tempUser = apiService.buildUserFromToken(token);
        if (tempUser) {
          localStorage.setItem('element_user:v1', JSON.stringify(tempUser));
        }
        selectRes = await apiService.selectShop({ shop_slug: SHOP_SLUG });
        const newToken = selectRes.token || selectRes.access_token || (selectRes.data && (selectRes.data.token || selectRes.data.access_token));
        if (newToken) {
          token = newToken;
        }
      }

      let user = apiService.buildUserFromToken(token);
      if (!user) {
        throw new Error('No se pudieron leer los datos del usuario desde el token');
      }
      // Fallback: if token has no name, try response body in every possible shape
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
        if (bodyName) {
          user = { ...user, name: bodyName };
        }
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
      }
      login(user);
      showNotification('Correcto', 'success', `Inicio de sesión exitoso. ¡Bienvenido a ELEMENT, ${user.name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'Verifica tus credenciales e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" theme="dark" />
      <div className="animated-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Background effects */}
      <div className="auth-blob auth-blob--tl" />
      <div className="auth-blob auth-blob--br" />

      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Back to landing */}
        <button
          type="button"
          className="btn btn-ghost btn-small"
          style={{ marginBottom: 32, gap: 6 }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={15} /> Volver al inicio
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
                display: 'block',
                margin: '0 auto',
                filter: 'drop-shadow(0 0 20px rgba(182, 148, 98, 0.3))',
              }}
            />
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label htmlFor="login-email" className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Correo electrónico</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="input-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn"
              onClick={handleLogin}
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
                  Cargando...
                </span>
              ) : (
                'INGRESAR'
              )}
            </button>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p className="small" style={{ fontSize: 12, marginBottom: 8 }}>
              <button type="button" className="link-btn" onClick={() => navigate('/forgot-password')}>
                ¿Olvidaste tu contraseña?
              </button>
            </p>
            <p className="small" style={{ fontSize: 12 }}>
              ¿No tienes cuenta?{' '}
              <button type="button" className="link-btn" onClick={() => navigate('/register')}>
                Regístrate
              </button>
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
