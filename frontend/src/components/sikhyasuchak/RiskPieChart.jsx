/**
 * RiskPieChart.jsx
 * Displays risk distribution as a doughnut chart using Chart.js.
 * Props: { low, medium, high } — student counts per risk level
 */
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const RiskPieChart = ({ low = 0, medium = 0, high = 0 }) => {
  const total = low + medium + high;

  const data = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [{
      data: [low, medium, high],
      backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
      borderColor:     ['#16A34A', '#D97706', '#DC2626'],
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 12, weight: '600' },
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed;
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
            return ` ${val} students (${pct}%)`;
          },
        },
      },
    },
  };

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        No prediction data yet
      </div>
    );
  }

  return (
    <div className="relative">
      <Doughnut data={data} options={options} />
      {/* Center total label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-10px' }}>
        <p className="text-2xl font-black text-slate-800">{total}</p>
        <p className="text-xs text-slate-500">Students</p>
      </div>
    </div>
  );
};

export default RiskPieChart;
