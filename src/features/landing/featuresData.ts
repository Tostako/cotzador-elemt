import carrusel1 from '../../assets/interior_webp/carrusell1.webp';
import carrusel2 from '../../assets/interior_webp/carrusell2.webp';
import carrusel3 from '../../assets/interior_webp/carrusell3.webp';
import carrusel4 from '../../assets/interior_webp/carrusell4.webp';
import carrusel5 from '../../assets/interior_webp/CARUSELL5.webp';

export type LandingFeature = {
  /** Se usa en la URL: /funciones/:slug */
  slug: string;
  title: string;
  /** Texto corto: el que va sobre la imagen en el carrusel. */
  desc: string;
  img: string;
  /** Frase de apoyo bajo el título en la página de detalle. */
  intro: string;
  /** Explicación a detalle, un párrafo por bloque. */
  body: string[];
  /** Puntos concretos de lo que resuelve. */
  bullets: string[];
};

/** Las 5 funciones principales. Comparten datos entre el carrusel de la
 *  landing, sus páginas de detalle y los enlaces del footer. */
export const landingFeatures: LandingFeature[] = [
  {
    slug: 'planos',
    title: 'Planos de casa',
    desc: 'Dibuja la vivienda por niveles y habitaciones en un editor CAD; de ahí salen todos los cálculos.',
    img: carrusel1,
    intro: 'El punto de partida de todo el proyecto: dibujas una vez y el resto de la plataforma se alimenta de ese plano.',
    body: [
      'El editor de planos funciona por niveles y habitaciones. Cada piso puede tener las habitaciones que necesites, y cada habitación se dibuja levantando muros con distancias exactas en metros: eliges la dirección, escribes la medida y el muro queda trazado.',
      'A medida que cierras los espacios, el área y el perímetro se calculan solos. También puedes marcar aberturas (puertas y vanos) y agregar columnas a un muro con su ancho y saliente, para que los cálculos posteriores descuenten lo que no lleva acabado.',
      'Ese plano no se queda ahí: es la fuente de la que salen los metros cuadrados para enchapes, el perímetro para barrederas y el área para la estimación de obra. Dibujar bien una vez te ahorra rehacer cuentas en cada etapa.',
    ],
    bullets: [
      'Varios pisos y habitaciones dentro de un mismo proyecto',
      'Muros por distancia exacta, con aberturas y columnas',
      'Área y perímetro calculados automáticamente',
      'Edición en pantalla completa para trabajar cómodo',
    ],
  },
  {
    slug: 'cotizacion',
    title: 'Cotización inteligente',
    desc: 'Asistente de 5 pasos con cálculo automático de área y precio en vivo.',
    img: carrusel2,
    intro: 'Un recorrido guiado que convierte los datos del proyecto en una cotización lista para enviar.',
    body: [
      'El cotizador te lleva por cinco pasos ordenados: datos del cliente, características del proyecto, servicios a incluir, condiciones comerciales y revisión final. En ningún momento tienes que salir a buscar una fórmula o abrir una hoja de cálculo aparte.',
      'El precio se actualiza en vivo mientras avanzas. Si cambias el área, agregas un servicio o ajustas una tarifa, el total se recalcula al instante, así puedes mostrarle al cliente distintos escenarios en la misma reunión.',
      'Las tarifas salen de la configuración de tu estudio, no de valores sueltos escritos a mano. Eso significa que cuando actualizas tus precios una vez, todas las cotizaciones nuevas los aplican sin que tengas que acordarte.',
    ],
    bullets: [
      'Asistente guiado de 5 pasos, sin campos sueltos',
      'Total recalculado en vivo con cada cambio',
      'Toma las tarifas configuradas de tu estudio',
      'Queda guardada y lista para convertirse en cuenta de cobro',
    ],
  },
  {
    slug: 'enchapes-barrederas',
    title: 'Enchapes y barrederas',
    desc: 'Pisos, paredes y perímetros por tramos, con desperdicio y número de piezas.',
    img: carrusel3,
    intro: 'Los cálculos que más tiempo quitan y donde más fácil se cometen errores, resueltos a partir del plano.',
    body: [
      'Para enchapes trabajas pisos y paredes por tramos: defines las superficies, eliges el formato de la baldosa y el patrón de instalación, y la plataforma calcula cuántas piezas necesitas, cuánto desperdicio contemplar y qué sobrantes te quedan.',
      'Para barrederas el cálculo parte del perímetro que ya trazaste en el plano, descontando aberturas y considerando las columnas de cada muro. El resultado es el número de piezas por material, no solo un metraje suelto que después toca traducir a compras.',
      'Todo sale del mismo plano, así que si corriges una medida no tienes que rehacer los cálculos uno por uno: vuelves a consultar y los números ya están actualizados.',
    ],
    bullets: [
      'Pisos y paredes por tramos independientes',
      'Patrones de instalación y porcentaje de desperdicio',
      'Barrederas por perímetro real, descontando aberturas',
      'Resultado en número de piezas, listo para pedir',
    ],
  },
  {
    slug: 'estimacion-obra',
    title: 'Estimación de obra',
    desc: 'Costo de construcción por m²: obra negra, gris y acabados.',
    img: carrusel4,
    intro: 'Una cifra defendible del costo de construcción, separada por etapa, para hablar con números frente al cliente.',
    body: [
      'La estimación toma el área construida del proyecto y la multiplica por valores por metro cuadrado que tú configuras, divididos en las tres etapas con las que realmente se maneja una obra: obra negra, obra gris y acabados.',
      'Verlo separado por etapa importa. Le permite al cliente entender en qué se va el dinero y te permite a ti cotizar por fases cuando el proyecto no se va a ejecutar completo de una sola vez.',
      'Como los valores por m² quedan guardados en la configuración de tu estudio, la estimación refleja tus costos reales y se mantiene consistente entre proyectos, en vez de depender de lo que recordabas ese día.',
    ],
    bullets: [
      'Costo por m² separado en obra negra, gris y acabados',
      'Usa el área que ya salió del plano',
      'Valores configurables según los costos de tu estudio',
      'Sirve para cotizar el proyecto completo o por fases',
    ],
  },
  {
    slug: 'cuentas-de-cobro',
    title: 'Cuentas de cobro',
    desc: 'Documentos formales con firma, numeración, plan de pagos y registro de abonos.',
    img: carrusel5,
    intro: 'El cierre del ciclo: de la cotización aprobada al documento formal y al control de lo que te han pagado.',
    body: [
      'A partir de una cotización aprobada generas la cuenta de cobro como documento formal: con los datos de tu empresa, numeración consecutiva, firma y el desglose de lo que se está cobrando. Queda presentable para enviar al cliente sin pasar por otro programa.',
      'Cada cobro puede tener su plan de pagos con las cuotas que acuerdes, en porcentajes o valores. A medida que el cliente abona, registras los pagos y el documento refleja cuánto se ha pagado y cuánto queda pendiente.',
      'Así dejas de llevar en paralelo una carpeta de documentos y una hoja aparte con quién te debe qué: el estado de cada cobro vive junto al proyecto que lo originó.',
    ],
    bullets: [
      'Documento formal con firma y numeración consecutiva',
      'Se genera desde la cotización, sin volver a digitar',
      'Planes de pago por cuotas configurables',
      'Registro de abonos y estado de cada cobro',
    ],
  },
];

export const getFeatureBySlug = (slug?: string) => landingFeatures.find((f) => f.slug === slug);
