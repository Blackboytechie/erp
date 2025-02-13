import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';

interface AgingData {
	receivables: {
		customer: string;
		total: number;
		current: number;
		days_1_30: number;
		days_31_60: number;
		days_61_90: number;
		days_over_90: number;
	}[];
	payables: {
		supplier: string;
		total: number;
		current: number;
		days_1_30: number;
		days_31_60: number;
		days_61_90: number;
		days_over_90: number;
	}[];
	summary: {
		total_receivables: number;
		total_payables: number;
		average_collection_period: number;
		average_payment_period: number;
	};
}

export default function AgingReports() {
	const [data, setData] = useState<AgingData | null>(null);
	const [loading, setLoading] = useState(true);
	const [view, setView] = useState<'receivables' | 'payables'>('receivables');

	useEffect(() => {
		fetchAgingData();
	}, []);

	const fetchAgingData = async () => {
		try {
			const { data: agingData, error } = await supabase
				.rpc('get_aging_reports');

			if (error) throw error;
			setData(agingData);
		} catch (error) {
			console.error('Error fetching aging data:', error);
			toast.error('Failed to fetch aging reports');
		} finally {
			setLoading(false);
		}
	};

	if (loading || !data) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	const renderAgingTable = (items: any[], type: 'receivables' | 'payables') => (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-gray-200">
				<thead>
					<tr>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							{type === 'receivables' ? 'Customer' : 'Supplier'}
						</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">1-30 Days</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">31-60 Days</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">61-90 Days</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Over 90 Days</th>
						<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200">
					{items.map((item, idx) => (
						<tr key={idx}>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item[type === 'receivables' ? 'customer' : 'supplier']}</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.current.toLocaleString()}</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.days_1_30.toLocaleString()}</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.days_31_60.toLocaleString()}</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.days_61_90.toLocaleString()}</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.days_over_90.toLocaleString()}</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">₹{item.total.toLocaleString()}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold text-gray-900">Aging Reports</h2>
				<div className="flex space-x-4">
					<button
						onClick={() => setView('receivables')}
						className={`px-4 py-2 rounded-md ${
							view === 'receivables'
								? 'bg-primary-600 text-white'
								: 'bg-white text-gray-700 hover:bg-gray-50'
						}`}
					>
						Receivables
					</button>
					<button
						onClick={() => setView('payables')}
						className={`px-4 py-2 rounded-md ${
							view === 'payables'
								? 'bg-primary-600 text-white'
								: 'bg-white text-gray-700 hover:bg-gray-50'
						}`}
					>
						Payables
					</button>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<dt className="text-sm font-medium text-gray-500 truncate">Total Receivables</dt>
						<dd className="mt-1 text-2xl font-semibold text-gray-900">₹{data.summary.total_receivables.toLocaleString()}</dd>
					</div>
				</div>
				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<dt className="text-sm font-medium text-gray-500 truncate">Total Payables</dt>
						<dd className="mt-1 text-2xl font-semibold text-gray-900">₹{data.summary.total_payables.toLocaleString()}</dd>
					</div>
				</div>
				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<dt className="text-sm font-medium text-gray-500 truncate">Avg. Collection Period</dt>
						<dd className="mt-1 text-2xl font-semibold text-gray-900">{data.summary.average_collection_period} days</dd>
					</div>
				</div>
				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<dt className="text-sm font-medium text-gray-500 truncate">Avg. Payment Period</dt>
						<dd className="mt-1 text-2xl font-semibold text-gray-900">{data.summary.average_payment_period} days</dd>
					</div>
				</div>
			</div>

			{/* Aging Table */}
			<div className="bg-white shadow rounded-lg p-6">
				<h3 className="text-lg font-medium text-gray-900 mb-4">
					{view === 'receivables' ? 'Receivables Aging' : 'Payables Aging'}
				</h3>
				{renderAgingTable(data[view], view)}
			</div>
		</div>
	);
}