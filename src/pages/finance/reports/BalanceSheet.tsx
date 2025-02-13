import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';

interface BalanceSheetData {
	assets: {
		category: string;
		items: { name: string; amount: number; }[];
		total: number;
	}[];
	liabilities: {
		category: string;
		items: { name: string; amount: number; }[];
		total: number;
	}[];
	equity: {
		category: string;
		items: { name: string; amount: number; }[];
		total: number;
	}[];
	total_assets: number;
	total_liabilities: number;
	total_equity: number;
}

export default function BalanceSheet() {
	const [data, setData] = useState<BalanceSheetData>({
		assets: [],
		liabilities: [],
		equity: [],
		total_assets: 0,
		total_liabilities: 0,
		total_equity: 0
	});
	const [loading, setLoading] = useState(true);
	const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);

	useEffect(() => {
		fetchBalanceSheetData();
	}, [asOf]);

	const fetchBalanceSheetData = async () => {
		try {
			const { data: bsData, error } = await supabase
				.rpc('get_balance_sheet', { 
					as_of_date: asOf 
				});

			if (error) throw error;
			
			// Comprehensive null and undefined checks
			const processedData = {
				assets: Array.isArray(bsData?.assets) ? bsData.assets : [],
				liabilities: Array.isArray(bsData?.liabilities) ? bsData.liabilities : [],
				equity: Array.isArray(bsData?.equity) ? bsData.equity : [],
				total_assets: bsData?.total_assets ?? 0,
				total_liabilities: bsData?.total_liabilities ?? 0,
				total_equity: bsData?.total_equity ?? 0
			};

			setData(processedData);
		} catch (error) {
			console.error('Error fetching balance sheet data:', error);
			toast.error('Failed to fetch balance sheet data');
			
			// Set default empty state in case of error
			setData({
				assets: [],
				liabilities: [],
				equity: [],
				total_assets: 0,
				total_liabilities: 0,
				total_equity: 0
			});
		} finally {
			setLoading(false);
		}
	};

	const renderSection = (title: string, data: { category: string; items: { name: string; amount: number; }[]; total: number; }[], total: number) => (
		<div className="bg-white shadow rounded-lg p-6">
			<h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
			{data.map((category, idx) => (
				<div key={idx} className="mb-6 last:mb-0">
					<h4 className="text-md font-medium text-gray-700 mb-2">{category.category}</h4>
					<div className="space-y-2">
						{category.items.map((item, itemIdx) => (
							<div key={itemIdx} className="flex justify-between text-sm">
								<span className="text-gray-600">{item.name}</span>
								<span className="text-gray-900">₹{item.amount.toLocaleString()}</span>
							</div>
						))}
						<div className="flex justify-between text-sm font-medium border-t pt-2">
							<span className="text-gray-700">Total {category.category}</span>
							<span className="text-gray-900">₹{category.total.toLocaleString()}</span>
						</div>
					</div>
				</div>
			))}
			<div className="mt-4 pt-4 border-t-2 flex justify-between text-base font-semibold">
				<span>Total {title}</span>
				<span>₹{total.toLocaleString()}</span>
			</div>
		</div>
	);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold text-gray-900">Balance Sheet</h2>
				<input
					type="date"
					value={asOf}
					onChange={(e) => setAsOf(e.target.value)}
					className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
				/>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{renderSection('Assets', data.assets, data.total_assets)}
				{renderSection('Liabilities', data.liabilities, data.total_liabilities)}
				{renderSection('Equity', data.equity, data.total_equity)}
			</div>

			<div className="bg-white shadow rounded-lg p-6">
				<div className="flex justify-between text-lg font-semibold">
					<span>Total Liabilities and Equity</span>
					<span>₹{(data.total_liabilities + data.total_equity).toLocaleString()}</span>
				</div>
			</div>
		</div>
	);
}