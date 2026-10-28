import React, { useState, useRef } from 'react';
import { Layers, Plus, Trash2, Tag, FolderPlus, Edit2, Check, X } from 'lucide-react';

export default function CategoryManager({
  categories = [],
  menuItems = [],
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inputRef = useRef(null);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      setError('Please enter a category name (e.g. Beverages, Desserts) and click Add Category.');
      return;
    }

    if (categories.some((c) => String(c.name || '').toLowerCase() === trimmed.toLowerCase())) {
      setError('A category with this name already exists.');
      inputRef.current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMsg('');
      await onCreateCategory(trimmed);
      setNewCategoryName('');
      setSuccessMsg(`Category "${trimmed}" added successfully!`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.message || 'Failed to create category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (catId) => {
    if (!editingName.trim()) return;
    try {
      if (onUpdateCategory) {
        await onUpdateCategory(catId, editingName.trim());
      }
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      setError(err.message || 'Failed to update category.');
    }
  };

  const getItemCount = (categoryId) => {
    return menuItems.filter((item) => item.category_id === categoryId).length;
  };

  return (
    <div className="bg-white border border-[#F0E4D7] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0E4D7]">
        <div>
          <h2 className="text-lg font-heading font-bold text-[#2B2118] tracking-tight">
            Menu Categories
          </h2>
          <p className="text-xs text-[#7A6A5C] mt-0.5">
            Organize dishes into sections on your customer menu.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FFF1E6] text-[#F26B1D] w-fit">
          {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[#FDECEC] border border-[#E5484D]/30 text-[#D92D20] text-xs font-semibold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
        <input
          ref={inputRef}
          type="text"
          value={newCategoryName}
          onChange={(e) => {
            setNewCategoryName(e.target.value);
            if (error) setError('');
          }}
          placeholder="New category name (e.g. Smash Burgers, Drinks)..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:ring-2 focus:ring-[#F26B1D]/20 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.98] text-white font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Adding...' : 'Add Category'}</span>
        </button>
      </form>

      {/* Categories Cards */}
      {categories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#F0E4D7] rounded-2xl bg-[#FFF9F2]/50">
          <FolderPlus className="w-10 h-10 text-[#9E8E81] mx-auto mb-2" />
          <p className="text-sm font-bold text-[#2B2118]">No categories added yet</p>
          <p className="text-xs text-[#7A6A5C] mt-1">Type a name above (e.g. "Burgers") to create your first category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const count = getItemCount(cat.id);
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="group flex items-center justify-between p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] hover:border-[#F26B1D]/40 hover:bg-white transition shadow-sm"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(cat.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#F26B1D] text-[#2B2118] text-xs font-bold focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1.5 rounded-lg bg-[#1F9D55] text-white hover:bg-[#188045] cursor-pointer"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1.5 rounded-lg bg-[#F0E4D7] text-[#7A6A5C] hover:bg-[#E5D7C7] cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-center text-[#F26B1D] shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-[#2B2118] truncate">{cat.name}</p>
                        <p className="text-[11px] text-[#7A6A5C] font-medium">
                          {count} {count === 1 ? 'dish' : 'dishes'} listed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(cat)}
                        title="Rename category"
                        className="opacity-70 group-hover:opacity-100 p-2 rounded-lg hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${cat.name}" category? This will also remove dishes in this category.`)) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        title="Delete category"
                        className="opacity-70 group-hover:opacity-100 p-2 rounded-lg hover:bg-[#FEE4E2] hover:text-[#D92D20] text-[#9E8E81] transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
