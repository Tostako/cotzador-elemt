import { useState, useRef } from 'react';
import { useStore } from '../../shared/services/store';
import { useShallow } from 'zustand/react/shallow';
import { showNotification } from '../../shared/hooks/useNotifications';
import { TourBanner } from '../../shared/components/TourBanner';
import { isTourActiveForRoute } from '../../shared/utils/tour';
import { BackButton } from '../../shared/components/BackButton';
import { User, Save, Building2, Signature, Upload, Trash2 } from 'lucide-react';

export function PerfilPage() {
  const { user, config, updateConfig, login } = useStore(
    useShallow((s) => ({ user: s.user, config: s.config, updateConfig: s.updateConfig, login: s.login }))
  );

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
      showNotification('Atención', 'warning', 'El nombre no puede estar vacío.');
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
      showNotification('Actualización correcta', 'success', 'Perfil actualizado correctamente.');
    } catch (err: any) {
      showNotification('Error', 'error', err.message || 'Error al actualizar perfil');
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
      showNotification('Error', 'error', 'Solo se permiten archivos de imagen.');
      return;
    }
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification('Error', 'error', 'La imagen no debe superar 1MB.');
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
      showNotification('Correcto', 'success', 'Imagen cargada correctamente.');
    };
    reader.onerror = () => {
      showNotification('Error', 'error', 'Error al leer la imagen.');
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
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}><User size={28} color="#b69462" /> Perfil</h1>
      <p className="small">Gestiona tus datos personales, logo y firma digital</p>

      {/* Profile Info */}
      <div className="card mt-2">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><User size={18} color="#b69462" /> Información Personal</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="perfil-nombre">Nombre completo</label>
            <input id="perfil-nombre" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="perfil-email">Correo electrónico</label>
            <input id="perfil-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="perfil-telefono">Teléfono</label>
            <input id="perfil-telefono" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +57 300 123 4567" />
          </div>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }} htmlFor="perfil-profesion">Profesión</label>
            <input id="perfil-profesion" className="input" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Ej: Arquitecto, Ingeniero..." />
          </div>
          <button type="button" className="btn" onClick={handleSaveProfile} disabled={isSaving} style={{ gap: 6 }}>
            {isSaving ? 'Guardando...' : <><Save size={16} /> Guardar Perfil</>}
          </button>
        </div>
      </div>

      {/* Company Logo */}
      <div className="card mt-2">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={18} color="#b69462" /> Logo de la Empresa</h3>
        <p className="small" style={{ color: '#999', marginBottom: 12 }}>
          Este logo aparecerá en tus cuentas de cobro y recibos de pago.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            aria-label="Subir logo de empresa"
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
                <button type="button" className="btn btn-small btn-secondary" onClick={() => logoInputRef.current?.click()}>
                  <Upload size={14} /> Cambiar
                </button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => clearImage('company', 'logo')}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="upload-area-btn"
              aria-label="Subir logo de empresa"
              onClick={() => logoInputRef.current?.click()}
            >
              <Building2 size={30} color="#8c8578" style={{ marginBottom: 8 }} />
              <p className="small" style={{ color: '#999' }}>Haz clic para subir tu logo</p>
            </button>
          )}
        </div>
      </div>

      {/* Digital Signature */}
      <div className="card mt-2">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Signature size={18} color="#b69462" /> Firma Digital</h3>
        <p className="small" style={{ color: '#999', marginBottom: 12 }}>
          Tu firma aparecerá en las cuentas de cobro generadas.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            ref={signatureInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            aria-label="Subir firma digital"
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
                <button type="button" className="btn btn-small btn-secondary" onClick={() => signatureInputRef.current?.click()}>
                  <Upload size={14} /> Cambiar
                </button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => clearImage('representative', 'signature')}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="upload-area-btn"
              aria-label="Subir firma digital"
              onClick={() => signatureInputRef.current?.click()}
            >
              <Signature size={30} color="#8c8578" style={{ marginBottom: 8 }} />
              <p className="small" style={{ color: '#999' }}>Haz clic para subir tu firma</p>
            </button>
          )}
        </div>
      </div>

      {showTour && <TourBanner />}
    </main>
  );
}
