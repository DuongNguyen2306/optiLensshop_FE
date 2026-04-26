import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveInbound,
  cancelInbound,
  completeInbound,
  receiveInbound,
  rejectInbound,
  submitInbound,
  updateInbound,
} from "@/api/inboundApi";
import type { InboundPayload } from "@/types/inbound";

function invalidateInboundQueries(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ["inbounds", "list"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ["inbounds", "detail", id] });
  }
  queryClient.invalidateQueries({ queryKey: ["inbounds", "ledger"] });
}

export function useInboundActions(inboundId?: string) {
  const queryClient = useQueryClient();
  const submitMutation = useMutation({
    mutationFn: (id: string) => submitInbound(id),
    onSuccess: () => invalidateInboundQueries(queryClient, inboundId),
  });
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveInbound(id),
    onSuccess: () => invalidateInboundQueries(queryClient, inboundId),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectInbound(id, note),
    onSuccess: () => invalidateInboundQueries(queryClient, inboundId),
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelInbound(id, reason),
    onSuccess: () => invalidateInboundQueries(queryClient, inboundId),
  });
  const receiveMutation = useMutation({
    mutationFn: (id: string) => receiveInbound(id),
    onSuccess: () => invalidateInboundQueries(queryClient, inboundId),
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => completeInbound(id),
    onSuccess: () => invalidateInboundQueries(queryClient, inboundId),
  });
  const updateDraftMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InboundPayload }) => updateInbound(id, payload),
    onSuccess: () => invalidateInboundQueries(queryClient, inboundId),
  });

  return {
    submitMutation,
    approveMutation,
    rejectMutation,
    cancelMutation,
    receiveMutation,
    completeMutation,
    updateDraftMutation,
  };
}

