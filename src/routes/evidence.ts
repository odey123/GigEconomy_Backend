import { Router } from 'express';
import EvidenceController from '../controllers/EvidenceController';
import authMiddleware from '../middleware/auth';
import upload from '../utils/multer';

const router = Router();

router.post('/upload', authMiddleware, upload.array('photos', 10), (req, res, next) =>
  EvidenceController.uploadEvidence(req as any, res, next)
);

router.get('/', authMiddleware, (req, res, next) =>
  EvidenceController.getUserEvidence(req as any, res, next)
);

router.get('/:evidenceId', authMiddleware, (req, res, next) =>
  EvidenceController.getEvidenceById(req as any, res, next)
);

router.get('/contract/:contractId', (req, res, next) =>
  EvidenceController.getContractEvidence(req as any, res, next)
);

export default router;
