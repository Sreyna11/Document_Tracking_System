import { useQuery } from '@tanstack/react-query';

export const fetchAccounts = async () => {
    const token = sessionStorage.getItem("auth_token");
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch('http://document_tracking_system.test/api/accounts', { headers });
    if (!response.ok) {
        throw new Error('Failed to fetch accounts');
    }
    return response.json();
};

export const useAccounts = () => {
    return useQuery({
        queryKey: ['accounts'],
        queryFn: fetchAccounts,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';

export const updateAccount = async ({ id, data }) => {
    const token = sessionStorage.getItem("auth_token");
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`http://document_tracking_system.test/api/accounts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error('Failed to update account');
    }
    return response.json();
};

export const useUpdateAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        },
    });
};
