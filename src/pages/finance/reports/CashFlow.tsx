import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';

interface CashFlowData {
	operating_activities: {
		category: string;
		items?: { description: string; amount: number; }[];
		total: number;
	};
	investing_activities: {
		category: string;
		items?: { description: string; amount: number; }[];
		total: number;
	};
	financing_activities: {
		category: string;
		items?: { description: string; amount: number; }[];
		total: number;
	};
	net_cash_flow: number;
	beginning_cash: number;
	ending_cash: number;
}

export default function CashFlow() {
	const [data, setData] = useState<CashFlowData | null>(null);
	const [loading, setLoading] = useState(true);
	const [period, setPeriod] = useState('month');

	useEffect(() => {
		fetchCashFlowData();
	}, [period]);

	const fetchCashFlowData = async () => {
		try {
			const { data: cfData, error } = await supabase
				.rpc('get_cash_flow_statement', { 
					time_period: period 
				});

			if (error) throw error;
			
			// Comprehensive null and undefined checks
			const processedData = {
				operating_activities: { 
					...cfData?.operating_activities,
					items: cfData?.operating_activities?.items || []
				},
				investing_activities: { 
					...cfData?.investing_activities,
					items: cfData?.investing_activities?.items || []
				},
				financing_activities: { 
					...cfData?.financing_activities,
					items: cfData?.financing_activities?.items || []
				},
				net_cash_flow: cfData?.net_cash_flow ?? 0,
				beginning_cash: cfData?.beginning_cash ?? 0,
				ending_cash: cfData?.ending_cash ?? 0
			};


			setData(processedData);
		} catch (error) {
			console.error('Error fetching cash flow data:', error);
			toast.error('Failed to fetch cash flow data');
			
			// Set default empty state in case of error
			setData({
				operating_activities: { 
					category: 'Operating Activities', 
					items: [], 
					total: 0 
				},
				investing_activities: { 
					category: 'Investing Activities', 
					items: [], 
					total: 0 
				},
				financing_activities: { 
					category: 'Financing Activities', 
					items: [], 
					total: 0 
				},
				net_cash_flow: 0,
				beginning_cash: 0,
				ending_cash: 0
			});
		} finally {
			setLoading(false);
		}
	};

	const renderSection = (title: string, data: { category: string; items?: { description: string; amount: number; }[]; total: number; }) => (
		<div className="bg-white shadow rounded-lg p-6 mb-6">
			<h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
			<div className="space-y-4">
				{(data.items || []).map((item, idx) => (
					<div key={idx} className="flex justify-between text-sm">
						<span className="text-gray-600">{item.description}</span>
						<span className={`${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
							₹{item.amount.toLocaleString()}
						</span>
					</div>
				))}
				<div className="pt-4 border-t flex justify-between text-sm font-medium">
					<span>Net {title}</span>
					<span className={`${data.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
						₹{data.total.toLocaleString()}
					</span>
				</div>
			</div>
		</div>
	);

	if (loading || !data) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold text-gray-900">Cash Flow Statement</h2>
				<select
					value={period}
					onChange={(e) => setPeriod(e.target.value)}
					className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
				>
					<option value="month">This Month</option>
					<option value="quarter">This Quarter</option>
					<option value="year">This Year</option>
				</select>
			</div>

			{renderSection('Operating Activities', data.operating_activities)}
			{renderSection('Investing Activities', data.investing_activities)}
			{renderSection('Financing Activities', data.financing_activities)}

			<div className="bg-white shadow rounded-lg p-6">
				<div className="space-y-4">
					<div className="flex justify-between text-sm">
						<span className="text-gray-600">Beginning Cash Balance</span>
						<span className="text-gray-900">₹{data.beginning_cash.toLocaleString()}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-gray-600">Net Cash Flow</span>
						<span className={`${data.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
							₹{data.net_cash_flow.toLocaleString()}
						</span>
					</div>
					<div className="pt-4 border-t flex justify-between text-base font-semibold">
						<span>Ending Cash Balance</span>
						<span className="text-gray-900">₹{data.ending_cash.toLocaleString()}</span>
					</div>
				</div>
			</div>
		</div>
	);
}