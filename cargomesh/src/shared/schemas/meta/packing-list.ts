import {z} from 'zod';
import {ProposedDeclarationFieldSchema,ModelProposalSchema} from './model-proposal';
export const PackingListShapeSchema=z.object({groups:z.array(z.object({label:z.string().min(1).max(100),fields:z.array(ProposedDeclarationFieldSchema).max(8)}).strict()).max(8)}).strict();
export const PackingListReviewSchema=z.object({inputRevision:z.number().int().nonnegative(),sha256:z.string().regex(/^[a-f0-9]{64}$/),pages:z.number().int().min(1).max(12),groups:z.array(z.object({label:z.string(),proposal:ModelProposalSchema})).max(8),policy:z.literal('PACKING_LIST_COMPLETENESS_V1'),regulatoryReview:z.literal('NOT_ASSESSED'),missing:z.array(z.string()),requiresHumanConfirmation:z.literal(true)}).strict();
export type PackingListReview=z.infer<typeof PackingListReviewSchema>;
