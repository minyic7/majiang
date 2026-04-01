const NUMS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function WanArt({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 60 80" className="w-full h-full">
      <text
        x="30" y="30" textAnchor="middle" dominantBaseline="middle"
        fontSize="28" fontWeight="bold" fill="#1a1a1a" fontFamily="serif"
      >
        {NUMS[value - 1]}
      </text>
      <text
        x="30" y="62" textAnchor="middle" dominantBaseline="middle"
        fontSize="22" fontWeight="bold" fill="#c62828" fontFamily="serif"
      >
        万
      </text>
    </svg>
  );
}
