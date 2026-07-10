import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { showNotification, Toaster } from '../../shared/hooks/useNotifications';
import logoAbbreviated from '../../assets/LOGO ABREVIADO/ELEMENThaus - Logo Abreviado White.png';
import { Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';

export function ForgotPasswordPage() {
  const navigate = useNavigate();


  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim() && !phone.trim()) {
      showNotification('Atención', 'warning', 'Ingresa tu correo electrónico o número de teléfono registrado para identificar tu cuenta.');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      showNotification('Atención', 'warning', 'Tu nueva contraseña debe tener al menos 6 caracteres para mayor seguridad.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Error', 'error', 'Asegúrate de que la contraseña y la confirmación sean idénticas.');
      return;
    }

    setIsLoading(true);
    try {
      const { apiService, SHOP_SLUG } = await import('../../shared/services/api');
      const payload: any = {
        new_password: newPassword.trim(),
        shop_slug: SHOP_SLUG,
      };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      const res = await apiService.resetPassword(payload);
      showNotification('Actualización correcta', 'success', res?.data?.message || 'Tu contraseña ha sido actualizada correctamente. Inicia sesión con la nueva contraseña.');
      navigate('/login');
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'No se pudo actualizar la contraseña. Verifica los datos e intenta de nuevo.');
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
          {/* Back to login */}
          <button
            type="button"
            className="btn btn-ghost btn-small"
            style={{ marginBottom: 32, gap: 6 }}
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={15} /> Volver al inicio de sesión
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

            <h2 className="auth-title">
              <KeyRound size={22} color="#b69462" /> Recuperar Contraseña
            </h2>
            <p className="small" style={{ textAlign: 'center', marginBottom: 24, color: '#999' }}>
              Ingresa tu teléfono y la nueva contraseña
            </p>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label htmlFor="fp-email" className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Correo electrónico</label>
                <input
                  id="fp-email"
                  className="input"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className="small" style={{ color: '#666' }}>— o —</span>
              </div>
              <div>
                <label htmlFor="fp-phone" className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Teléfono</label>
                <input
                  id="fp-phone"
                  className="input"
                  type="tel"
                  placeholder="Ej: +57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="small" style={{ color: '#666', marginTop: 4 }}>
                  Ingresa tu correo o teléfono registrado
                </p>
              </div>
              <div>
                <label htmlFor="fp-new" className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="fp-new"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              <div>
                <label htmlFor="fp-confirm" className="small" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Confirmar contraseña</label>
                <input
                  id="fp-confirm"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                />
              </div>
              <button
                type="button"
                className="btn"
                onClick={handleReset}
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
                    Actualizando...
                  </span>
                ) : (
                  'ACTUALIZAR CONTRASEÑA'
                )}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
