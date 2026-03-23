const express = require("express")
const statusController = require("../controllers/statusController")
const authMiddleware = require("../middleware/authMiddleware").default
const {multerMiddleware} = require("../config/cloudinaryConfig")
const router = express.Router()
// const {updateProfile} = require("../controllers/statusControllers")


router.post('/', authMiddleware,multerMiddleware, statusController.createStatus);



router.get("/", authMiddleware, statusController.getStatuses)

router.put("/:statusId/view",authMiddleware, statusController.viewStatus)
router.delete("/:statusId",authMiddleware, statusController.deleteStatus)
module.exports = router;