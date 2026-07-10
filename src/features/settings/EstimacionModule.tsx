import { useState } from 'react';
import { BackButton } from '../../shared/components/BackButton';
import { EstimationCalculatorPage } from '../calculator/EstimationCalculatorPage';
import { EstimacionPage } from './EstimacionPage';
import { Calculator, Ruler, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';

type Tab = 'calculadora' | 'precios';
type IconType = ComponentType<{ size?: number | string }>;

/**
 * Estimación de Obra: fusiona la calculadora de estimaciones y la
 * configuración de precios en una sola sección con pestañas.
 */
export function EstimacionModule() {
  const [tab, setTab] = useState<Tab>('calculadora');

  const tabButton = (value: Tab, Icon: IconType, label: string) => (
    <button type="button"
      onClick={() => setTab(value)}
      className={`btn btn-small ${tab === value ? '' : 'btn-secondary'}`}
      style={{ flex: 1, gap: 6 }}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <main>
      <BackButton />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}><Calculator size={28} color="#b69462" /> Estimación de Obra</h1>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0 8px' }}>
        {tabButton('calculadora', Ruler, 'Calculadora')}
        {tabButton('precios', Wallet, 'Precios')}
      </div>

      {tab === 'calculadora' ? <EstimationCalculatorPage /> : <EstimacionPage />}
    </main>
  );
}
