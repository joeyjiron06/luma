const { app } = require('@azure/functions');

app.http('hello', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return { 
            jsonBody: { success: true, message: 'Hello from Luma API!' }
        };
    }
});
