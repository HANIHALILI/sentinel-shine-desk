# Build stage
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install

COPY . .

# Build-time environment variables
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WS_URL=
ARG VITE_OIDC_ISSUER=
ARG VITE_OIDC_CLIENT_ID=
ARG VITE_OIDC_SCOPES="openid profile email"
ARG VITE_OIDC_REDIRECT_URI=
ARG VITE_OIDC_POST_LOGOUT_REDIRECT_URI=
ARG VITE_OIDC_ROLE_CLAIM=roles

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx/statusguard.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
