import { useState, useRef } from 'react';
import { useStore } from '../../shared/services/store';
import { useAppStore } from '../../shared/hooks/useNotifications';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';

export function PerfilPage() {
  const { user, config, updateConfig, login } = useStore();
  const showNotification = useAppStore((s) => s.showNotification);
  const showTour = isTourActiveForRoute('/perfil');

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profession, setProfession] = useState(user?.profession || '');
  const [isSaving, setIsSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showNotification('El nombre no puede estar vacío', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const { apiService } = await import('../../shared/services/api');
      await apiService.updateMe({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: profession.trim() || undefined,
      });
      // Update local store
      if (user) {
        login({ ...user, name: name.trim(), email: email.trim(), profession: profession.trim() || undefined });
      }
      showNotification('Perfil actualizado correctamente', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar perfil', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: 'company' | 'representative',
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Solo se permiten archivos de imagen', 'error');
      return;
    }
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification('La imagen no debe superar 1MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateConfig({
        invoice: {
          ...config.invoice,
          [section]: {
            ...config.invoice[section],
            [field]: reader.result as string,
          },
        },
      });
      showNotification('Imagen cargada correctamente', 'success');
    };
    reader.onerror = () => {
      showNotification('Error al leer la imagen', 'error');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (section: 'company' | 'representative', field: string) => {
    updateConfig({
      invoice: {
        ...config.invoice,
        [section]: {
          ...config.invoice[section],
          [field]: '',
        },
      },
    });
    if (section === 'company' && logoInputRef.current) logoInputRef.current.value = '';
    if (section === 'representative' && signatureInputRef.current) signatureInputRef.current.value = '';
  };

  return (
    <main>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>👤 Perfil</h1>
      <p className="small">Gestiona tus datos personales, logo y firma digital</p>

      {/* Profile Info */}
      <div className="card mt-2">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📝 Información Personal</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Nombre completo</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Correo electrónico</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Teléfono</label>
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +57 300 123 4567" />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>Profesión</label>
            <input className="input" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Ej: Arquitecto, Ingeniero..." />
          </div>
          <button className="btn" onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? 'Guardando...' : '💾 Guardar Perfil'}
          </button>
        </div>
      </div>

      {/* Company Logo */}
      <div className="card mt-2">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>🏢 Logo de la Empresa</h3>
        <p className="small" style={{ color: '#999', marginBottom: 12 }}>
          Este logo aparecerá en tus cuentas de cobro y recibos de pago.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e, 'company', 'logo')}
          />
          {config.invoice.company.logo ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={config.invoice.company.logo}
                alt="Logo empresa"
                style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                <button className="btn btn-small btn-secondary" onClick={() => logoInputRef.current?.click()}>
                  🔄 Cambiar
                </button>
                <button className="btn btn-small btn-danger" onClick={() => clearImage('company', 'logo')}>
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 32,
                border: '2px dashed var(--color-line)',
                borderRadius: 12,
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => logoInputRef.current?.click()}
            >
              <span style={{ fontSize: 32, marginBottom: 8, display: 'block' }}>🏢</span>
              <p className="small" style={{ color: '#999' }}>Haz clic para subir tu logo</p>
            </div>
          )}
        </div>
      </div>

      {/* Digital Signature */}
      <div className="card mt-2">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>✍️ Firma Digital</h3>
        <p className="small" style={{ color: '#999', marginBottom: 12 }}>
          Tu firma aparecerá en las cuentas de cobro generadas.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            ref={signatureInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e, 'representative', 'signature')}
          />
          {config.invoice.representative.signature ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={config.invoice.representative.signature}
                alt="Firma digital"
                style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                <button className="btn btn-small btn-secondary" onClick={() => signatureInputRef.current?.click()}>
                  🔄 Cambiar
                </button>
                <button className="btn btn-small btn-danger" onClick={() => clearImage('representative', 'signature')}>
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 32,
                border: '2px dashed var(--color-line)',
                borderRadius: 12,
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => signatureInputRef.current?.click()}
            >
              <span style={{ fontSize: 32, marginBottom: 8, display: 'block' }}>✍️</span>
              <p className="small" style={{ color: '#999' }}>Haz clic para subir tu firma</p>
            </div>
          )}
        </div>
      </div>

      {showTour && <TourBanner />}
    </main>
  );
}
