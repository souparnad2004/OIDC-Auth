import type { Response } from "express";

export class ApiResponse{
    static success(res:Response, data:any = null, message: string = "success", statusCode: number = 200) {
        return res.status(statusCode)
        .json({
            success: true,
            message, 
            data
        })
    }

    static created(res: Response, data:any= null, message: string = "Resource created successfully", statusCode: number = 201) {
        return res.status(statusCode)
        .json({
            success: true,
            message,
            data
        })
    }

    static notfound(res:Response,message: string, error:any=null) {
        return res.status(401).json({
            message,
            error
        })
    }

}

