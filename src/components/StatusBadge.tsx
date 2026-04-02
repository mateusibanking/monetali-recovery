import { DelinquencyStatus, statusLabels, statusColors } from '@/data/mockData';

const StatusBadge = ({ status }: { status: DelinquencyStatus }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[status]}`}>
    {statusLabels[status]}
  </span>
);

export default StatusBadge;
