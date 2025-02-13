import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import { IoTrendingUp, IoTrendingDown } from 'react-icons/io5';
import toast from 'react-hot-toast';

interface ProfitLossData {
	total_revenue: number;
	total_expenses: number;
	net_profit: number;
	revenue_breakdown: {
		category: string;
		amount: number;
	}[];
	expense_breakdown: {
		category: string;
		amount: number;
	}[];
}


export default function ProfitLoss() {
	const [data, setData] = useState<ProfitLossData>({
		total_revenue: 0,
		total_expenses: 0,
		net_profit: 0,
		revenue_breakdown: [],
		expense_breakdown: []
	});

	const [loading, setLoading] = useState(true);
	const [dateRange, setDateRange] = useState('month'); // month, quarter, year

	useEffect(() => {
		fetchProfitLossData();
	}, [dateRange]);

	const fetchProfitLossData = async () => {
		try {
			const { data: plData, error } = await supabase
				.rpc('get_profit_loss_report', { 
					time_period: dateRange 
				});

			if (error) throw error;
			
			// Comprehensive null and undefined checks
			const processedData = {
				total_revenue: plData?.total_revenue ?? 0,
				total_expenses: plData?.total_expenses ?? 0,
				net_profit: (plData?.total_revenue ?? 0) - (plData?.total_expenses ?? 0),
				revenue_breakdown: Array.isArray(plData?.revenue_breakdown) ? plData.revenue_breakdown : [],
				expense_breakdown: Array.isArray(plData?.expense_breakdown) ? plData.expense_breakdown : []
			};

			setData(processedData);
		} catch (error) {
			console.error('Error fetching profit/loss data:', error);
			toast.error('Failed to fetch profit/loss data');
			
			// Set default empty state in case of error
			setData({
				total_revenue: 0,
				total_expenses: 0,
				net_profit: 0,
				revenue_breakdown: [],
				expense_breakdown: []
			});
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Date Range Selector */}
			<div className="flex justify-end">
				<select
					value={dateRange}
					onChange={(e) => setDateRange(e.target.value)}
					className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
				>
					<option value="month">This Month</option>
					<option value="quarter">This Quarter</option>
					<option value="year">This Year</option>
				</select>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<IoTrendingUp className={`h-6 w-6 ${data.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
									<dd className="text-2xl font-semibold text-gray-900">₹{data.total_revenue.toLocaleString()}</dd>
								</dl>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<IoTrendingDown className="h-6 w-6 text-red-400" />
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
									<dd className="text-2xl font-semibold text-gray-900">₹{data.total_expenses.toLocaleString()}</dd>
								</dl>
							</div>
						</div>
					</div>
				</div>

				<div className="bg-white overflow-hidden shadow rounded-lg">
					<div className="p-5">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<IoTrendingUp className={`h-6 w-6 ${data.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-gray-500 truncate">Net Profit/Loss</dt>
									<dd className={`text-2xl font-semibold ${data.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
										₹{data.net_profit.toLocaleString()}
									</dd>
								</dl>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Breakdown Tables */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				{/* Revenue Breakdown */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg font-medium leading-6 text-gray-900">Revenue Breakdown</h3>
						<div className="mt-4">
							<table className="min-w-full divide-y divide-gray-200">
								<thead>
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Category
										</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Amount
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{data.revenue_breakdown.map((item, index) => (
										<tr key={index}>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{item.category}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
												₹{item.amount.toLocaleString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* Expense Breakdown */}
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h3 className="text-lg font-medium leading-6 text-gray-900">Expense Breakdown</h3>
						<div className="mt-4">
							<table className="min-w-full divide-y divide-gray-200">
								<thead>
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Category
										</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Amount
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{data.expense_breakdown.map((item, index) => (
										<tr key={index}>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{item.category}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
												₹{item.amount.toLocaleString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}