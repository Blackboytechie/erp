import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabaseClient';
import { IoAdd, IoPencil, IoTrash, IoSearch } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import PurchaseOrderModal from '@/components/PurchaseOrderModal';

interface PurchaseOrder {
	id: string;
	order_number: string;
	created_at: string;
	expected_delivery_date: string;
	total_amount: number;
	status: 'draft' | 'sent' | 'received' | 'cancelled';
	payment_status: 'pending' | 'partial' | 'paid';
	supplier_id: string;
	shipping_address: string;
	notes: string;
	suppliers: {
		name: string;
		email: string;
	};
}

export const PurchaseOrders = () => {
	const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
	const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

	useEffect(() => {
		fetchPurchaseOrders();
	}, []);

	useEffect(() => {
		const filtered = purchaseOrders.filter(order => 
			order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.suppliers.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.status.toLowerCase().includes(searchQuery.toLowerCase())
		);
		setFilteredOrders(filtered);
	}, [searchQuery, purchaseOrders]);

	const fetchPurchaseOrders = async () => {
		try {
			const { data, error } = await supabase
				.from('purchase_orders')
				.select(`
					*,
					suppliers (
						name,
						email
					)
				`)
				.order('created_at', { ascending: false });

			if (error) throw error;
			setPurchaseOrders(data || []);
			setFilteredOrders(data || []);
		} catch (error) {
			console.error('Error fetching purchase orders:', error);
			toast.error('Failed to fetch purchase orders');
		} finally {
			setLoading(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'draft':
				return 'bg-gray-100 text-gray-800';
			case 'sent':
				return 'bg-blue-100 text-blue-800';
			case 'received':
				return 'bg-green-100 text-green-800';
			case 'cancelled':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getPaymentStatusColor = (status: string) => {
		switch (status) {
			case 'paid':
				return 'bg-green-100 text-green-800';
			case 'partial':
				return 'bg-yellow-100 text-yellow-800';
			case 'pending':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const handleEdit = (order: PurchaseOrder) => {
		setSelectedOrder(order);
		setShowModal(true);
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm('Are you sure you want to delete this order?')) return;

		try {
			const { error: itemsError } = await supabase
				.from('purchase_order_items')
				.delete()
				.eq('purchase_order_id', id);

			if (itemsError) throw itemsError;

			const { error: orderError } = await supabase
				.from('purchase_orders')
				.delete()
				.eq('id', id);

			if (orderError) throw orderError;

			setPurchaseOrders(prevOrders => prevOrders.filter(order => order.id !== id));
			setFilteredOrders(prevFiltered => prevFiltered.filter(order => order.id !== id));
			toast.success('Purchase order deleted successfully');
		} catch (error) {
			console.error('Error deleting purchase order:', error);
			toast.error('Failed to delete purchase order');
		}
	};

	const handleAdd = () => {
		setSelectedOrder(null);
		setShowModal(true);
	};

	if (loading) {
		return (
			<div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
				<div className="animate-pulse">
					<div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
					<div className="space-y-4">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="h-12 bg-gray-200 rounded"></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="px-4 sm:px-6 lg:px-8">
			<div className="sm:flex sm:items-center">
				<div className="sm:flex-auto">
					<h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
					<p className="mt-2 text-sm text-gray-700">
						Manage purchase orders, track deliveries, and handle supplier payments.
					</p>
				</div>
				<div className="mt-4 sm:mt-0 sm:ml-16 flex flex-col sm:flex-row gap-4">
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<IoSearch className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							placeholder="Search orders..."
							className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<button
						type="button"
						onClick={handleAdd}
						className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
					>
						<IoAdd className="-ml-1 mr-2 h-5 w-5" />
						New Order
					</button>
				</div>
			</div>

			<div className="mt-8 flow-root">
				<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
						<div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
							<table className="min-w-full divide-y divide-gray-300">
								<thead className="bg-gray-50">
									<tr>
										<th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
											Order Details
										</th>
										<th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
											Supplier
										</th>
										<th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
											Dates
										</th>
										<th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
											Amount
										</th>
										<th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
											Status
										</th>
										<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{filteredOrders.map((order) => (
										<tr key={order.id} className="hover:bg-gray-50">
											<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
												<div className="flex flex-col">
													<span className="font-medium text-gray-900">{order.order_number}</span>
													<div className="sm:hidden mt-2 space-y-2">
														<div className="flex flex-col space-y-1 text-xs text-gray-500">
															<span>Supplier: {order.suppliers.name}</span>
															<span>Email: {order.suppliers.email}</span>
															<span>Created: {format(new Date(order.created_at), 'MMM d, yyyy')}</span>
															<span>Delivery: {order.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'MMM d, yyyy') : 'Not set'}</span>
														</div>
													</div>
												</div>
											</td>
											<td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												<div className="font-medium">{order.suppliers.name}</div>
												<div className="text-gray-500">{order.suppliers.email}</div>
											</td>
											<td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												<div>Created: {format(new Date(order.created_at), 'MMM d, yyyy')}</div>
												<div>Delivery: {order.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'MMM d, yyyy') : 'Not set'}</div>
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
												₹{order.total_amount.toLocaleString()}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm">
												<div className="flex flex-col gap-2">
													<span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(order.status)}`}>
														{order.status.charAt(0).toUpperCase() + order.status.slice(1)}
													</span>
													<span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getPaymentStatusColor(order.payment_status)}`}>
														{order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
													</span>
												</div>
											</td>
											<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
												<div className="flex justify-end gap-3">
													<button
														onClick={() => handleEdit(order)}
														className="text-primary-600 hover:text-primary-900 p-1 rounded-full hover:bg-gray-100"
													>
														<IoPencil className="h-5 w-5" />
														<span className="sr-only">Edit</span>
													</button>
													<button
														onClick={() => handleDelete(order.id)}
														className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-gray-100"
													>
														<IoTrash className="h-5 w-5" />
														<span className="sr-only">Delete</span>
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>

			<PurchaseOrderModal
				isOpen={showModal}
				onClose={() => {
					setShowModal(false);
					setSelectedOrder(null);
				}}
				order={selectedOrder}
				onOrderSaved={fetchPurchaseOrders}
			/>
		</div>
	);
};

export default PurchaseOrders;