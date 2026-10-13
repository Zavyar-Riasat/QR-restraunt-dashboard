import React, { useState } from 'react';
import { Layers, Plus, Trash2, Tag, FolderPlus, Edit2, Check, X } from 'lucide-react';

export default function CategoryManager({
  categories,
  menuItems,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if (categories.some((c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      setError('A category with this name already exists.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onCreateCategory(newCategoryName.trim());
      setNewCategoryName('');
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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-heading font-bold text-slate-900 tracking-tight">
            Menu Categories
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize dishes into sections on your customer menu.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 w-fit">
          {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => {
            setNewCategoryName(e.target.value);
            setError('');
          }}
          placeholder="New category name (e.g. Smash Burgers, Drinks)..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newCategoryName.trim()}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Category</span>
        </button>
      </form>

      {/* Categories Cards */}
      {categories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <FolderPlus className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No categories added yet</p>
          <p className="text-xs text-slate-500 mt-1">Type a name above (e.g. "Burgers") to create your first category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const count = getItemCount(cat.id);
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 hover:bg-white transition shadow-2xs"
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
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-500 text-slate-900 text-xs font-bold focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">{cat.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {count} {count === 1 ? 'dish' : 'dishes'} listed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(cat)}
                        title="Rename category"
                        className="opacity-60 group-hover:opacity-100 p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
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
                        className="opacity-60 group-hover:opacity-100 p-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition cursor-pointer"
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
