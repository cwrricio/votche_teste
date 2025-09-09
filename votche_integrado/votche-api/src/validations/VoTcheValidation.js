import * as Yup from 'yup'

export const meetingSchema = Yup.object({
    _id: Yup.number(),
    name: Yup.string().required(),
    description: Yup.string().required(),
    participants: Yup.mixed(), // Pode ser array ou string, depende do uso
    questions: Yup.mixed(),    // Pode ser array ou string, depende do uso
    agendamento: Yup.boolean().optional(), // Campo opcional
    horaTermino: Yup.date().nullable().optional() // Campo opcional
})

export async function validateMeetingSchema(data) {
    try {
        await meetingSchema.validate(data, { abortEarly: false })
        return null
    }
    catch (err) {
        return err.errors
    }
}