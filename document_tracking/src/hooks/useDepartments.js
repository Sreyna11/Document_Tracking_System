import { useQuery } from '@tanstack/react-query';

export const fetchDepartments = async () => {
    const token = sessionStorage.getItem("auth_token");
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch('http://document_tracking_system.test/api/job-departments', { headers });
    if (!response.ok) {
        throw new Error('Failed to fetch departments');
    }
    return response.json();
};

export const useDepartments = () => {
    return useQuery({
        queryKey: ['departments'],
        queryFn: fetchDepartments,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
