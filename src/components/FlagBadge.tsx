import { Flag, flagLabels, flagColors } from '@/data/mockData';

const FlagBadge = ({ flag }: { flag: Flag }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${flagColors[flag]}`}>
    {flagLabels[flag]}
  </span>
);

export default FlagBadge;
