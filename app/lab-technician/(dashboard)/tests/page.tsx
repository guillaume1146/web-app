'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaFlask } from 'react-icons/fa';

interface LabTest {
 id: string;
 testName: string;
 category: string;
 description?: string;
 price: number;
 turnaroundTime: string;
 sampleType: string;
 preparation?: string;
}

type LabTestFormData = Omit<LabTest, 'id'>;

const CATEGORIES = [
 'Blood',
 'Urine',
 'Imaging',
 'Infectious Disease',
 'Microbiology',
 'Genetic',
 'Other',
];

const SAMPLE_TYPES = [
 'Blood',
 'Urine',
 'Saliva',
 'Nasopharyngeal Swab',
 'Stool',
 'Tissue',
 'Other',
];

const emptyForm: LabTestFormData = {
 testName: '',
 category: 'Blood',
 description: '',
 price: 0,
 turnaroundTime: '',
 sampleType: 'Blood',
 preparation: '',
};

export default function LabTechTestsPage() {
 const [tests, setTests] = useState<LabTest[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('');
 const [showModal, setShowModal] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [formData, setFormData] = useState<LabTestFormData>(emptyForm);
 const [submitting, setSubmitting] = useState(false);

 const fetchTests = useCallback(async () => {
 try {
 setLoading(true);
 const res = await fetch('/api/lab-technician/tests');
 if (!res.ok) throw new Error('Failed to fetch lab tests');
 const data = await res.json();
 setTests(data.data || data);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred');
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchTests();
 }, [fetchTests]);

 const openCreateModal = () => {
 setEditingId(null);
 setFormData(emptyForm);
 setShowModal(true);
 };

 const openEditModal = (test: LabTest) => {
 setEditingId(test.id);
 setFormData({
 testName: test.testName,
 category: test.category,
 description: test.description || '',
 price: test.price,
 turnaroundTime: test.turnaroundTime,
 sampleType: test.sampleType,
 preparation: test.preparation || '',
 });
 setShowModal(true);
 };

 const closeModal = () => {
 setShowModal(false);
 setEditingId(null);
 setFormData(emptyForm);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);

 try {
 if (editingId) {
 const res = await fetch(`/api/lab-technician/tests/${editingId}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(formData),
 });
 if (!res.ok) throw new Error('Failed to update lab test');
 } else {
 const res = await fetch('/api/lab-technician/tests', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(formData),
 });
 if (!res.ok) throw new Error('Failed to create lab test');
 }
 closeModal();
 await fetchTests();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred');
 } finally {
 setSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm('Are you sure you want to delete this lab test?')) return;

 try {
 const res = await fetch(`/api/lab-technician/tests/${id}`, {
 method: 'DELETE',
 });
 if (!res.ok) throw new Error('Failed to delete lab test');
 await fetchTests();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred');
 }
 };

 const filteredTests = tests.filter((test) => {
 const matchesSearch = test.testName
 .toLowerCase()
 .includes(searchTerm.toLowerCase());
 const matchesCategory =
 !categoryFilter || test.category === categoryFilter;
 return matchesSearch && matchesCategory;
 });

 return (
 <div className="p-6 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-3">
 <FaFlask className="text-3xl text-indigo-600" />
 <h1 className="text-2xl font-bold text-gray-800">
 Lab Test Catalog
 </h1>
 </div>
 <button
 onClick={openCreateModal}
 className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
 >
 <FaPlus />
 Add Test
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
 placeholder="Search lab tests..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
 />
 </div>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
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
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
 </div>
 ) : (
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Test Name
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Category
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Sample Type
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Turnaround Time
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Price (MUR)
 </th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredTests.length === 0 ? (
 <tr>
 <td
 colSpan={6}
 className="px-6 py-12 text-center text-gray-500"
 >
 No lab tests found.
 </td>
 </tr>
 ) : (
 filteredTests.map((test) => (
 <tr
 key={test.id}
 className="hover:bg-gray-50 transition-colors"
 >
 <td className="px-6 py-4">
 <div className="font-medium text-gray-900">
 {test.testName}
 </div>
 {test.description && (
 <div className="text-sm text-gray-500 line-clamp-1">
 {test.description}
 </div>
 )}
 </td>
 <td className="px-6 py-4">
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
 {test.category}
 </span>
 </td>
 <td className="px-6 py-4 text-gray-700">
 {test.sampleType}
 </td>
 <td className="px-6 py-4 text-gray-700">
 {test.turnaroundTime}
 </td>
 <td className="px-6 py-4 text-gray-700 font-medium">
 {test.price.toFixed(2)}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => openEditModal(test)}
 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
 title="Edit"
 >
 <FaEdit />
 </button>
 <button
 onClick={() => handleDelete(test.id)}
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
 {editingId ? 'Edit Lab Test' : 'Add Lab Test'}
 </h2>
 <button
 onClick={closeModal}
 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <FaTimes className="text-gray-500" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-5">
 {/* Test Name */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Test Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={formData.testName}
 onChange={(e) =>
 setFormData({ ...formData, testName: e.target.value })
 }
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
 />
 </div>

 {/* Category + Sample Type */}
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
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
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
 Sample Type <span className="text-red-500">*</span>
 </label>
 <select
 required
 value={formData.sampleType}
 onChange={(e) =>
 setFormData({ ...formData, sampleType: e.target.value })
 }
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
 >
 {SAMPLE_TYPES.map((type) => (
 <option key={type} value={type}>
 {type}
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
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
 />
 </div>

 {/* Price + Turnaround Time */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Turnaround Time <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 required
 value={formData.turnaroundTime}
 onChange={(e) =>
 setFormData({
 ...formData,
 turnaroundTime: e.target.value,
 })
 }
 placeholder="e.g. 24 hours, 3-5 days"
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
 />
 </div>
 </div>

 {/* Preparation */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Preparation Instructions
 </label>
 <textarea
 value={formData.preparation}
 onChange={(e) =>
 setFormData({ ...formData, preparation: e.target.value })
 }
 rows={3}
 placeholder="e.g. Fasting for 12 hours before test"
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
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
 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {submitting
 ? 'Saving...'
 : editingId
 ? 'Update Test'
 : 'Add Test'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
