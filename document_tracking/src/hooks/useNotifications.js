import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const fetchNotifications = async () => {
    const token = sessionStorage.getItem("auth_token");
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch('http://document_tracking_system.test/api/notifications', { headers });
    if (!response.ok) {
        throw new Error('Failed to fetch notifications');
    }
    return response.json();
};

export const createNotification = async (notificationData) => {
    const token = sessionStorage.getItem("auth_token");
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch('http://document_tracking_system.test/api/notifications', { 
        method: 'POST',
        headers,
        body: JSON.stringify(notificationData)
    });
    if (!response.ok) {
        throw new Error('Failed to create notification');
    }
    return response.json();
}

export const useNotifications = () => {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: fetchNotifications,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

export const useCreateNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });
};

export const updateNotification = async ({ id, data }) => {
    const token = sessionStorage.getItem("auth_token");
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`http://document_tracking_system.test/api/notifications/${id}`, { 
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error('Failed to update notification');
    }
    return response.json();
}

export const useUpdateNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });
};
