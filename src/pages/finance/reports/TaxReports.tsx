import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import toast from 'react-hot-toast';

interface TaxData {
	gst_summary?: {
		period: string;
		collected: number;
		paid: number;
		net_payable: number;
	}[];
	tax_liability?: {
		type: string;
		amount: number;
		due_date: string;
		status: 'paid' | 'pending';
	}[];
	total_tax_liability?: number;
	total_tax_paid?: number;
}


export default function TaxReports() {
	const [data, setData] = useState<TaxData | null>(null);
	const [loading, setLoading] = useState(true);
	const [period, setPeriod] = useState('current');

	useEffect(() => {
		fetchTaxData();
	}, [period]);

	const fetchTaxData = async () => {
		try {
			const { data: taxData, error } = await supabase
				.rpc('get_tax_reports', { 
					report_period: period 
				});

			if (error) throw error;
			
			// Comprehensive null and undefined checks
			const processedData = {
				gst_summary: Array.isArray(taxData?.gst_summary) ? taxData.gst_summary : [],
				tax_liability: Array.isArray(taxData?.tax_liability) ? taxData.tax_liability : [],
				total_tax_liability: taxData?.tax_liability?.reduce((sum, item) => sum + item.amount, 0) || 0,
				total_tax_paid: taxData?.tax_liability?.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0) || 0
			};

			setData(processedData);
		} catch (error) {
			console.error('Error fetching tax data:', error);
			toast.error('Failed to fetch tax reports');
			
			// Set default empty state in case of error
			setData({
				gst_summary: [],
				tax_liability: [],
				total_tax_liability: 0,
				total_tax_paid: 0
			});
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

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold text-gray-900">Tax Reports</h2>
				<select
					value={period}
					onChange={(e) => setPeriod(e.target.value)}
					className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
				>
					<option value="current">Current Period</option>
					<option value="previous">Previous Period</option>
					<option value="year">This Year</option>
				</select>
			</div>

			{/* GST Summary */}
			<div className="bg-white shadow rounded-lg p-6">
				<h3 className="text-lg font-medium text-gray-900 mb-4">GST Summary</h3>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead>
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GST Collected</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GST Paid</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Payable</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{data.gst_summary.map((item, idx) => (
								<tr key={idx}>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.period}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.collected.toLocaleString()}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.paid.toLocaleString()}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">₹{item.net_payable.toLocaleString()}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Tax Liabilities */}
			<div className="bg-white shadow rounded-lg p-6">
				<h3 className="text-lg font-medium text-gray-900 mb-4">Tax Liabilities</h3>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead>
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{data.tax_liability.map((item, idx) => (
								<tr key={idx}>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{item.amount.toLocaleString()}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.due_date).toLocaleDateString()}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm">
										<span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
											item.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
										}`}>
											{item.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>



		</div>
	);
}