'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaPills } from 'react-icons/fa';

interface Medicine {
 id: string;
 name: string;
 genericName?: string;
 category: string;
 description?: string;
 dosageForm: string;
 strength: string;
 price: number;
 quantity: number;
 inStock: boolean;
 requiresPrescription: boolean;
 sideEffects: string[];
}

type MedicineFormData = Omit<Medicine, 'id'>;

const CATEGORIES = [
 'Pain Relief',
 'Antibiotics',
 'Digestive Health',
 'Diabetes',
 'Allergy',
 'Respiratory',
 'Cardiovascular',
 'Vitamins',
 'Other',
];

const DOSAGE_FORMS = [
 'Tablet',
 'Capsule',
 'Syrup',
 'Injection',
 'Cream',
 'Drops',
 'Inhaler',
];

const emptyForm: MedicineFormData = {
 name: '',
 genericName: '',
 category: 'Pain Relief',
 description: '',
 dosageForm: 'Tablet',
 strength: '',
 price: 0,
 quantity: 0,
 inStock: true,
 requiresPrescription: false,
 sideEffects: [],
};

export default function PharmacistInventoryPage() {
 const [medicines, setMedicines] = useState<Medicine[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('');
 const [showModal, setShowModal] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [formData, setFormData] = useState<MedicineFormData>(emptyForm);
 const [sideEffectsInput, setSideEffectsInput] = useState('');
 const [submitting, setSubmitting] = useState(false);

 const fetchMedicines = useCallback(async () => {
 try {
 setLoading(true);
 const res = await fetch('/api/pharmacist/medicines');
 if (!res.ok) throw new Error('Failed to fetch medicines');
 const json = await res.json();
 setMedicines(json.data ?? json);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred');
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchMedicines();
 }, [fetchMedicines]);

 const openCreateModal = () => {
 setEditingId(null);
 setFormData(emptyForm);
 setSideEffectsInput('');
 setShowModal(true);
 };

 const openEditModal = (medicine: Medicine) => {
 setEditingId(medicine.id);
 setFormData({
 name: medicine.name,
 genericName: medicine.genericName || '',
 category: medicine.category,
 description: medicine.description || '',
 dosageForm: medicine.dosageForm,
 strength: medicine.strength,
 price: medicine.price,
 quantity: medicine.quantity ?? 0,
 inStock: medicine.inStock,
 requiresPrescription: medicine.requiresPrescription,
 sideEffects: medicine.sideEffects,
 });
 setSideEffectsInput((medicine.sideEffects || []).join(', '));
 setShowModal(true);
 };

 const closeModal = () => {
 setShowModal(false);
 setEditingId(null);
 setFormData(emptyForm);
 setSideEffectsInput('');
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);

 const payload = {
 ...formData,
 inStock: formData.quantity > 0,
 sideEffects: sideEffectsInput
 .split(',')
 .map((s) => s.trim())
 .filter(Boolean),
 };

 try {
 if (editingId) {
 const res = await fetch(`/api/pharmacist/medicines/${editingId}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });
 if (!res.ok) throw new Error('Failed to update medicine');
 } else {
 const res = await fetch('/api/pharmacist/medicines', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });
 if (!res.ok) throw new Error('Failed to create medicine');
 }
 closeModal();
 await fetchMedicines();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred');
 } finally {
 setSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm('Are you sure you want to delete this medicine?')) return;

 try {
 const res = await fetch(`/api/pharmacist/medicines/${id}`, {
 method: 'DELETE',
 });
 if (!res.ok) throw new Error('Failed to delete medicine');
 await fetchMedicines();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred');
 }
 };

 const toggleInStock = async (medicine: Medicine) => {
 try {
 const res = await fetch(`/api/pharmacist/medicines/${medicine.id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ...medicine, inStock: !medicine.inStock }),
 });
 if (!res.ok) throw new Error('Failed to update stock status');
 await fetchMedicines();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred');
 }
 };

 const filteredMedicines = medicines.filter((med) => {
 const matchesSearch = med.name
 .toLowerCase()
 .includes(searchTerm.toLowerCase());
 const matchesCategory = !categoryFilter || med.category === categoryFilter;
 return matchesSearch && matchesCategory;
 });

 return (
 <div className="p-6 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-3">
 <FaPills className="text-3xl text-teal-600" />
 <h1 className="text-2xl font-bold text-gray-800">
 Medicine Inventory
 </h1>
 </div>
 <button
 onClick={openCreateModal}
 className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
 >
 <FaPlus />
 Add Medicine
 </button>
 </div>

 {/* Error Banner */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)}>
 <FaTimes className="text-red-400 hover:text-red-600" />
 </button>
 </div>
 )}

 {/* Search and Filter */}
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search medicines..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
 />
 </div>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
 >
 <option value="">All Categories</option>
 {CATEGORIES.map((cat) => (
 <option key={cat} value={cat}>
 {cat}
 </option>
 ))}
 </select>
 </div>

 {/* Table */}
 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
 </div>
 ) : (
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Name
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Category
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Dosage Form
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Strength
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Price (MUR)
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Qty
 </th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 In Stock
 </th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Prescription Required
 </th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredMedicines.length === 0 ? (
 <tr>
 <td
 colSpan={9}
 className="px-6 py-12 text-center text-gray-500"
 >
 No medicines found.
 </td>
 </tr>
 ) : (
 filteredMedicines.map((med) => (
 <tr
 key={med.id}
 className="hover:bg-gray-50 transition-colors"
 >
 <td className="px-6 py-4">
 <div className="font-medium text-gray-900">
 {med.name}
 </div>
 {med.genericName && (
 <div className="text-sm text-gray-500">
 {med.genericName}
 </div>
 )}
 </td>
 <td className="px-6 py-4">
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
 {med.category}
 </span>
 </td>
 <td className="px-6 py-4 text-gray-700">
 {med.dosageForm}
 </td>
 <td className="px-6 py-4 text-gray-700">
 {med.strength}
 </td>
 <td className="px-6 py-4 text-gray-700 font-medium">
 {med.price.toFixed(2)}
 </td>
 <td className="px-4 py-3">
 <span className={`font-medium ${med.quantity > 10 ? 'text-green-600' : med.quantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
 {med.quantity}
 </span>
 </td>
 <td className="px-6 py-4 text-center">
 <button
 onClick={() => toggleInStock(med)}
 className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
 med.inStock
 ? 'bg-green-100 text-green-800 hover:bg-green-200'
 : 'bg-red-100 text-red-800 hover:bg-red-200'
 }`}
 >
 {med.inStock ? 'In Stock' : 'Out of Stock'}
 </button>
 </td>
 <td className="px-6 py-4 text-center">
 <span
 className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 med.requiresPrescription
 ? 'bg-amber-100 text-amber-800'
 : 'bg-gray-100 text-gray-600'
 }`}
 >
 {med.requiresPrescription ? 'Yes' : 'No'}
 </span>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => openEditModal(med)}
 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
 title="Edit"
 >
 <FaEdit />
 </button>
 <button
 onClick={() => handleDelete(med.id)}
 className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 title="Delete"
 >
 <FaTrash />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Modal */}
 {showModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/50"
 onClick={closeModal}
 ></div>
 <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h2 className="text-xl font-semibold text-gray-800">
 {editingId ? 'Edit Medicine' : 'Add Medicine'}
 </h2>
 <button
 onClick={closeModal}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <FaTimes className="text-gray-500" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-5">
 {/* Name */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) =>
 setFormData({ ...formData, name: e.target.value })
 }
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
 />
 </div>

 {/* Generic Name */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Generic Name
 </label>
 <input
 type="text"
 value={formData.genericName}
 onChange={(e) =>
 setFormData({ ...formData, genericName: e.target.value })
 }
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
 />
 </div>

 {/* Category + Dosage Form */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Category <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={formData.category}
 onChange={(e) =>
 setFormData({ ...formData, category: e.target.value })
 }
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
 >
 {CATEGORIES.map((cat) => (
 <option key={cat} value={cat}>
 {cat}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Dosage Form <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={formData.dosageForm}
 onChange={(e) =>
 setFormData({ ...formData, dosageForm: e.target.value })
 }
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
 >
 {DOSAGE_FORMS.map((form) => (
 <option key={form} value={form}>
 {form}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Description */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Description
 </label>
 <textarea
 value={formData.description}
 onChange={(e) =>
 setFormData({ ...formData, description: e.target.value })
 }
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
 />
 </div>

 {/* Strength + Price */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Strength <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={formData.strength}
 onChange={(e) =>
 setFormData({ ...formData, strength: e.target.value })
 }
 placeholder="e.g. 500mg"
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Price (MUR) <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 required
 min="0"
 step="0.01"
 value={formData.price}
 onChange={(e) =>
 setFormData({
 ...formData,
 price: parseFloat(e.target.value) || 0,
 })
 }
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
 />
 </div>
 </div>

 {/* Quantity in Stock */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Quantity in Stock
 </label>
 <input
 type="number"
 min="0"
 value={formData.quantity}
 onChange={(e) =>
 setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
 }
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Enter stock quantity"
 />
 </div>

 {/* Checkboxes */}
 <div className="flex flex-col sm:flex-row gap-6">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={formData.inStock}
 onChange={(e) =>
 setFormData({ ...formData, inStock: e.target.checked })
 }
 className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
 />
 <span className="text-sm text-gray-700">In Stock</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={formData.requiresPrescription}
 onChange={(e) =>
 setFormData({
 ...formData,
 requiresPrescription: e.target.checked,
 })
 }
 className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
 />
 <span className="text-sm text-gray-700">
 Requires Prescription
 </span>
 </label>
 </div>

 {/* Side Effects */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Side Effects{' '}
 <span className="text-gray-400 font-normal">
 (comma-separated)
 </span>
 </label>
 <input
 type="text"
 value={sideEffectsInput}
 onChange={(e) => setSideEffectsInput(e.target.value)}
 placeholder="e.g. Nausea, Dizziness, Headache"
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
 />
 </div>

 {/* Submit */}
 <div className="flex justify-end gap-3 pt-2">
 <button
 type="button"
 onClick={closeModal}
 className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={submitting}
 className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {submitting
 ? 'Saving...'
 : editingId
 ? 'Update Medicine'
 : 'Add Medicine'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
