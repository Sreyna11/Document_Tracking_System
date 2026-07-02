import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocuments, createDocument, updateDocument, deleteDocument, logDocumentAction, getDocumentVersions } from '../utils/api';

export const useDocuments = () => {
  return useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
  });
};

export const useDocumentVersions = (documentNumber) => {
  return useQuery({
    queryKey: ['documentVersions', documentNumber],
    queryFn: () => getDocumentVersions(documentNumber),
    enabled: !!documentNumber,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};
