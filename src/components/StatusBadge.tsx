import { Situacao, situacaoLabels, situacaoColors } from '@/data/mockData';

const StatusBadge = ({ status }: { status: Situacao }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${situacaoColors[status]}`}>
    {situacaoLabels[status]}
  </span>
);

export default StatusBadge;
