import { DataFilterOptions, SortOrder } from '@/types';

export function sortData<T>(
	data: T[], 
	options: DataFilterOptions<T>
): T[] {
	const { sortBy, sortOrder = 'asc', limit, offset } = options;

	if (!sortBy) return data;

	const sortedData = [...data].sort((a, b) => {
		const valueA = a[sortBy];
		const valueB = b[sortBy];

		if (valueA === undefined || valueB === undefined) return 0;

		if (typeof valueA === 'number' && typeof valueB === 'number') {
			return sortOrder === 'asc' 
				? valueA - valueB 
				: valueB - valueA;
		}

		return sortOrder === 'asc'
			? String(valueA).localeCompare(String(valueB))
			: String(valueB).localeCompare(String(valueA));
	});

	const startIndex = offset || 0;
	const endIndex = limit ? startIndex + limit : sortedData.length;

	return sortedData.slice(startIndex, endIndex);
}

export function filterData<T>(
	data: T[], 
	filters: Partial<T>
): T[] {
	return data.filter(item => 
		Object.entries(filters).every(([key, value]) => 
			item[key] === value
		)
	);
}

export function calculateAggregate<T>(
	data: T[], 
	field: keyof T
): number {
	return data.reduce((sum, item) => {
		const value = item[field];
		return sum + (typeof value === 'number' ? value : 0);
	}, 0);
}

export function groupBy<T>(
	data: T[], 
	key: keyof T
): Record<string, T[]> {
	return data.reduce((groups, item) => {
		const groupKey = String(item[key]);
		if (!groups[groupKey]) {
			groups[groupKey] = [];
		}
		groups[groupKey].push(item);
		return groups;
	}, {} as Record<string, T[]>);
}