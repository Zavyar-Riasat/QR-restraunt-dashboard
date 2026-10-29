import React, { useState, useEffect } from 'react';
import { Star, X, Check, CheckCircle2 } from 'lucide-react';
import { orderService } from '../../services/orderService.js';

const QUICK_TAGS = [
  '🔥 Piping Hot',
  '⚡ Fast Delivery',
  '😋 Delicious Food',
  '📦 Great Packaging',
  '👌 Polite Rider',
  '💰 Great Value',
];

const RATING_LABELS = {
  1: 'Needs improvement 😕',
  2: 'Fair 🙂',
  3: 'Good & tasty 😊',
  4: 'Very good! 😋',
  5: 'Outstanding & Delicious! ⭐',
};

export default function OrderRatingModal({
  isOpen,
  onClose,
  order,
  restaurant,
  onRatingSubmitted,
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Load existing rating if order was already rated
  useEffect(() => {
    if (order?.id) {
      const existing = order.customer_rating || orderService.getOrderRating(order.id);
      if (existing) {
        setRating(existing.rating || 5);
        setSelectedTags(existing.tags || []);
        setComment(existing.comment || '');
      } else {
        setRating(5);
        setSelectedTags(['😋 Delicious Food']);
        setComment('');
      }
      setIsSuccess(false);
    }
  }, [order?.id, isOpen]);

  if (!isOpen || !order) return null;

  const restaurantName =
    order.restaurant_name ||
    order.restaurant?.name ||
    restaurant?.name ||
    'the Restaurant';

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await orderService.submitOrderRating(
        order.id,
        {
          rating,
          comment,
          tags: selectedTags,
        },
        order.restaurant_id || restaurant?.id
      );

      setIsSuccess(true);
      if (onRatingSubmitted) {
        onRatingSubmitted(res);
      }
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 1800);
    } catch (err) {
      console.warn('Error submitting rating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStarValue = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#221A14] rounded-3xl border border-[#F0E4D7] dark:border-[#382B20] shadow-2xl max-w-md w-full overflow-hidden transition-all animate-scaleUp">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F0E4D7] dark:border-[#382B20] flex items-center justify-between bg-[#FFF9F2] dark:bg-[#281D16]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-sm sm:text-base text-[#2B2118] dark:text-[#FFF9F2]">
                Rate Your Food
              </h3>
              <p className="text-[11px] text-[#7A6A5C] dark:text-[#CBB8A8] font-medium">
                Order #{order.id} • {restaurantName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white dark:hover:bg-[#382B20] text-[#7A6A5C] dark:text-[#CBB8A8] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <h4 className="font-heading font-extrabold text-lg text-[#2B2118] dark:text-[#FFF9F2]">
              Thank You!
            </h4>
            <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] max-w-xs mx-auto">
              Your {rating}-star rating and review have been shared with the kitchen. We appreciate your feedback!
            </p>
            <div className="flex justify-center gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {/* Question Heading */}
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#F26B1D]">
                How was your experience?
              </p>
              <h4 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                Did you enjoy the meal from {restaurantName}?
              </h4>
            </div>

            {/* Interactive Stars */}
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const isFilled = starIndex <= activeStarValue;
                  return (
                    <button
                      key={starIndex}
                      type="button"
                      onClick={() => setRating(starIndex)}
                      onMouseEnter={() => setHoverRating(starIndex)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-xl hover:scale-115 active:scale-95 transition-all cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                            : 'text-slate-300 dark:text-slate-700 stroke-[1.5]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-[#F26B1D] h-5 transition-all">
                {RATING_LABELS[activeStarValue] || ''}
              </span>
            </div>

            {/* Quick Tag Pills */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A6A5C] dark:text-[#CBB8A8]">
                What stood out? (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#F26B1D] text-white border-[#F26B1D] shadow-2xs'
                          : 'bg-[#FFF9F2] dark:bg-[#281D16] text-[#7A6A5C] dark:text-[#CBB8A8] border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Review Comment Textarea */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A6A5C] dark:text-[#CBB8A8]">
                Detailed Review (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Tell the chef or other customers about the taste, portion, spice level, or delivery..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={400}
                className="w-full p-3 rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] bg-[#FFF9F2]/50 dark:bg-[#281D16] text-xs font-medium text-[#2B2118] dark:text-[#FFF9F2] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white dark:focus:bg-[#201712] transition resize-none"
              />
              <div className="flex justify-between text-[10px] text-[#9E8E81]">
                <span>Honest feedback helps the kitchen improve</span>
                <span>{comment.length}/400</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0E4D7] dark:border-[#382B20]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF9F2] dark:hover:bg-[#281D16] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold shadow-md shadow-[#F26B1D]/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>Submit Rating</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
