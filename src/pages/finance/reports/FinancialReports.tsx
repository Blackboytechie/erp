import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import ProfitLoss from './ProfitLoss';
import BalanceSheet from './BalanceSheet';
import CashFlow from './CashFlow';
import TaxReports from './TaxReports';
import AgingReports from './AgingReports';

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(' ');
}

export default function FinancialReports() {
	const tabs = [
		{ name: 'Profit & Loss', component: ProfitLoss },
		{ name: 'Balance Sheet', component: BalanceSheet },
		{ name: 'Cash Flow', component: CashFlow },
		{ name: 'Tax Reports', component: TaxReports },
		{ name: 'Aging Reports', component: AgingReports },
	];

	return (
		<div className="px-4 sm:px-6 lg:px-8 py-8">
			<div className="sm:flex sm:items-center">
				<div className="sm:flex-auto">
					<h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
					<p className="mt-2 text-sm text-gray-700">
						Comprehensive financial statements and analysis reports
					</p>
				</div>
			</div>

			<div className="mt-8">
				<Tab.Group>
					<Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
						{tabs.map((tab) => (
							<Tab
								key={tab.name}
								className={({ selected }) =>
									classNames(
										'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
										'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
										selected
											? 'bg-white shadow text-blue-700'
											: 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
									)
								}
							>
								{tab.name}
							</Tab>
						))}
					</Tab.List>
					<Tab.Panels className="mt-2">
						{tabs.map((tab) => (
							<Tab.Panel
								key={tab.name}
								className={classNames(
									'rounded-xl bg-white p-3',
									'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
								)}
							>
								<tab.component />
							</Tab.Panel>
						))}
					</Tab.Panels>
				</Tab.Group>
			</div>
		</div>
	);
}