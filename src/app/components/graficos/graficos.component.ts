import { Component, effect, ElementRef, input, OnDestroy, viewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { Seleccion } from '../../interface/seleccion';

// REGISTRA TODOS LOS TIPOS DE GRÁFICA Y COMPONENTES DE CHART.JS DE UNA VEZ.
Chart.register(...registerables);

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './graficos.component.html',
  styleUrls: ['./graficos.component.scss']
})
export class GraficosComponent implements OnDestroy {
  // INPUT<T>() RECIBE DATOS DEL COMPONENTE PADRE MEDIANTE UN SIGNAL.
  // EL PADRE LO USA ASÍ: <APP-GRAFICOS [SELECCIONES]="SELECCION">
  selecciones = input<Seleccion[]>([]);

  // VIEWCHILD APUNTA AL <CANVAS #CANVASDOUGHNUT> DEL TEMPLATE.
  // ES UNDEFINED HASTA QUE ANGULAR CONSTRUYE LA VISTA.
  private readonly canvasDoughnut = viewChild<ElementRef<HTMLCanvasElement>>('canvasDoughnut');

  // Canvas anterior de la gráfica de líneas, conservado como referencia:
  // private readonly canvasLinea = viewChild<ElementRef<HTMLCanvasElement>>('canvasLinea');
  // Canvas anterior del gráfico de barras, conservado como referencia:
  // private readonly canvasGoles = viewChild<ElementRef<HTMLCanvasElement>>('canvasGoles');

  // GUARDA LA INSTANCIA DE CHART PARA DESTRUIRLA ANTES DE REDIBUJAR.
  // SIN ESTO CHART.JS LANZARÍA EL ERROR "CANVAS IS ALREADY IN USE".
  // EN ESTE EJEMPLO, SOLO TENDREMOS UN ÚNICO CHART 'GOLES', PERO USAR UN MAP CON CLAVES DESCRIPTIVAS ES BUENA PRÁCTICA CUANDO EL COMPONENTE PUEDE CRECER CON MÁS GRÁFICAS EN EL FUTURO.
  private charts = new Map<string, Chart>();

  constructor() {
    // EFFECT() SE RE-EJECUTA AUTOMÁTICAMENTE CADA VEZ QUE CAMBIA SELECCIONES()
    // O CANVASDOUGHNUT(). SI EL CANVAS AÚN NO EXISTE, EL GUARD EVITA DIBUJAR;
    // EL EFFECT VOLVERÁ A EJECUTARSE CUANDO ANGULAR CONSTRUYA LA VISTA.
    effect(() => {
      const selecciones = this.selecciones();
      const canvas = this.canvasDoughnut()?.nativeElement;

      if (!canvas || selecciones.length === 0) {
        this.destroyChart('goles');
        return;
      }

      this.renderGolesPorGrupo(selecciones, canvas);
    });
  }

  // DESTRUYE LA INSTANCIA ANTERIOR PARA LIBERAR EL CANVAS ANTES DE REDIBUJAR.
  private destroyChart(key: string): void {
    this.charts.get(key)?.destroy();
    this.charts.delete(key);
  }

  /*
  // Gráfica anterior de líneas: media de goles por partido, redondeada a dos decimales.
  private renderMedia(seleccion: Seleccion[], canvas: HTMLCanvasElement): void {
    this.destroyChart('goles');

    const sorted: Seleccion[] = [...seleccion].sort((a, b) =>
      (b.partidos === 0 ? 0 : b.goles / b.partidos) -
      (a.partidos === 0 ? 0 : a.goles / a.partidos)
    );
    const medias = sorted.map(seleccion =>
      seleccion.partidos === 0
        ? 0
        : Number((seleccion.goles / seleccion.partidos).toFixed(2))
    );

    this.charts.set('goles', new Chart(canvas, {
      type: 'line',
      data: {
        labels: sorted.map(seleccion => seleccion.seleccion),
        datasets: [{
          label: 'Media de goles por partido',
          data: medias,
          backgroundColor: 'rgba(56, 128, 255, 0.2)',
          borderColor: '#3880ff',
          borderWidth: 2,
          pointRadius: 5,
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        // LA GRÁFICA SE REDIMENSIONA CON EL CONTENEDOR Y SU ALTURA SE CONTROLA DESDE CSS.
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Media de goles por partido por selección en la Eurocopa 2024'
          },
          tooltip: {
            callbacks: {
              label: context => {
                const seleccion = sorted[context.dataIndex];
                return `Media: ${Number(context.parsed.y).toFixed(2)} goles/partido | Partidos: ${seleccion.partidos}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Media de goles por partido'
            },
            ticks: {
              callback: value => Number(value).toFixed(2)
            },
            grid: { color: 'rgba(0, 0, 0, 0.06)' }
          },
          x: {
            title: {
              display: true,
              text: 'Selección'
            },
            ticks: { maxRotation: 45 },
            grid: { display: false }
          }
        }
      }
    }));
  }
  */

  private renderGolesPorGrupo(seleccion: Seleccion[], canvas: HTMLCanvasElement): void {
    this.destroyChart('goles');

    const grupos = [...new Set(seleccion.map(s => s.grupo))].sort();
    const totales = grupos.map(g =>
      seleccion.filter(s => s.grupo === g).reduce((acc, s) => acc + s.goles, 0)
    );
    const colors = ['#3880ff', '#2dd36f', '#eb445a', '#ffc409', '#5260ff', '#0cd1e8'];

    this.charts.set('goles', new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: grupos,
        datasets: [{
          label: 'Goles marcados',
          data: totales,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right'
          },
          title: {
            display: true,
            text: 'Goles por grupo en la Eurocopa 2024'
          },
          tooltip: {
            callbacks: {
              label: context => `${context.label}: ${context.parsed} goles`
            }
          }
        }
      }
    }));
  }

  /*
  // Gráfico anterior de barras, conservado comentado como referencia.
  private renderGoles(seleccion: Seleccion[], canvas: HTMLCanvasElement): void {
    this.destroyChart('goles');

    const sorted: Seleccion[] = [...seleccion].sort((a, b) => b.goles - a.goles);
    const colors = ['#3880ff', '#2dd36f', '#eb445a', '#ffc409', '#5260ff',
      '#0cd1e8', '#f7a34b', '#a855f7', '#10dc60', '#92949c'];

    this.charts.set('goles', new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(seleccion => seleccion.seleccion),
        datasets: [{
          label: 'Goles marcados',
          data: sorted.map(seleccion => seleccion.goles),
          backgroundColor: sorted.map((_, index) =>
            `${colors[index % colors.length]}bb`
          ),
          borderColor: sorted.map((_, index) => colors[index % colors.length]),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Goles marcados por selección en la Eurocopa 2024'
          },
          tooltip: {
            callbacks: {
              label: context => {
                const seleccion = sorted[context.dataIndex];
                return `Goles: ${seleccion.goles} | Partidos: ${seleccion.partidos}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Goles' },
            ticks: { stepSize: 1 },
            grid: { color: 'rgba(0, 0, 0, 0.06)' }
          },
          x: {
            title: { display: true, text: 'Selección' },
            ticks: { maxRotation: 45 },
            grid: { display: false }
          }
        }
      }
    }));
  }
  */

  // ANGULAR LLAMA A NGONDESTROY ANTES DE DESTRUIR EL COMPONENTE.
  // DESTRUIMOS TODAS LAS INSTANCIAS DE CHART PARA LIBERAR MEMORIA Y
  // EVITAR MEMORY LEAKS SI EL USUARIO NAVEGA VARIAS VECES.
  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
  }
}
