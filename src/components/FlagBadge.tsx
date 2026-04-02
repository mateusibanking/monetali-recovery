import { Flag, getFlagColor } from '@/data/mockData';

const FlagBadge = ({ flag }: { flag: Flag }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getFlagColor(flag)}`}>
    {flag}
  </span>
);

export default FlagBadge;
