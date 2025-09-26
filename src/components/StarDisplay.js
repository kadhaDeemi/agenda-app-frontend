import { Star } from 'lucide-react';

export default function StarDisplay({ rating }) {
  const totalStars = 5;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="flex items-center">
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <Star
            key={index}
            className={`h-5 w-5 ${starValue <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
          />
        );
      })}
    </div>
  );
}