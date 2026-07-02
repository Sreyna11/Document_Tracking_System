import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType } from '../utils/api';

export const useDocumentTypes = () => {
  return useQuery({
    queryKey: ['documentTypes'],
    queryFn: getDocumentTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

export const useCreateDocumentType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createDocumentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
    },
  });
};

export const useUpdateDocumentType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateDocumentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
    },
  });
};

export const useDeleteDocumentType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteDocumentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
    },
  });
};
