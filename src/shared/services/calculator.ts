import type { QuoteFormData, AreaResult } from '../types';

export function calculateArea(formData: QuoteFormData): AreaResult {
  let lot = 0;
  let first = 0;
  let overhangArea = 0;
  let upperFloorArea = 0;
  let upper = 0;
  let frontal = 0;
  let posterior = 0;
  let latIzq = 0;
  let latDer = 0;

  if (formData.areaMode === 'direct') {
    // Área Directa: el usuario ingresa el área del LOTE, no del primer piso
    lot = parseFloat(formData.directArea) || 0;
    first = lot * (formData.occ / 100);
    // En modo directo no hay dimensiones, usamos valores neutros para evitar NaN
    frontal = 0;
    posterior = 0;
    latIzq = 0;
    latDer = 0;
  } else {
    if (formData.lotShape === 'irregular') {
      frontal = parseFloat(formData.frontal) || 0;
      posterior = parseFloat(formData.posterior) || 0;
      latIzq = parseFloat(formData.latIzq) || 0;
      latDer = parseFloat(formData.latDer) || 0;
      lot = ((frontal + posterior) / 2) * ((latIzq + latDer) / 2);
    } else {
      frontal = parseFloat(formData.frontal) || 0;
      posterior = frontal;
      latIzq = parseFloat(formData.latIzq) || 0;
      latDer = latIzq;
      lot = frontal * latIzq;
    }
    first = lot * (formData.occ / 100);
  }

  if (formData.floors > 1) {
    let avgFrontal = (frontal + posterior) / 2;
    let avgLateral = (latIzq + latDer) / 2;

    // En modo área directa no hay dimensiones; estimamos lado cuadrado a partir del lote
    if (formData.areaMode === 'direct' && lot > 0) {
      const estimatedSide = Math.sqrt(lot);
      avgFrontal = estimatedSide;
      avgLateral = estimatedSide;
    }

    if (formData.facades.frontal) overhangArea += avgFrontal * formData.overhangSize;
    if (formData.facades.posterior) overhangArea += avgFrontal * formData.overhangSize;
    if (formData.facades.lateralLeft) overhangArea += avgLateral * formData.overhangSize;
    if (formData.facades.lateralRight) overhangArea += avgLateral * formData.overhangSize;

    upperFloorArea = first + overhangArea;
    upper = upperFloorArea * (formData.floors - 1);
  }

  return {
    lot,
    first,
    overhangArea,
    upperFloorArea,
    upper,
    total: first + upper,
    frontal,
    posterior,
    latIzq,
    latDer,
  };
}

export function calculatePrice(formData: QuoteFormData, config: { services: Record<string, { price: number; unit: string }>; subPackages: Record<string, { price: number; unit: string }>; completePackage: { price: number; unit: string } }): number {
  const area = calculateArea(formData);
  let total = 0;

  if (formData.hasCompletePackage) {
    const pkg = config.completePackage;
    total += pkg.unit === '/m²' ? area.total * pkg.price : pkg.price;
  } else {
    formData.selectedSubPackages.forEach((id) => {
      const pkg = config.subPackages[id];
      if (pkg) total += pkg.unit === '/m²' ? area.total * pkg.price : pkg.price;
    });

    formData.selectedServices.forEach((id) => {
      const service = config.services[id];
      if (service) total += service.unit === '/m²' ? area.total * service.price : service.price;
    });
  }

  formData.additionalServices.forEach((service) => {
    total += service.price || 0;
  });

  return Math.round(total - (formData.discount || 0));
}

export function roundTo50(value: number): number {
  return Math.round(value / 50) * 50;
}
