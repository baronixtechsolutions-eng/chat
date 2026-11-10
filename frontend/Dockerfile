FROM node:22-alpine
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
# Public variables are inlined into the browser bundle at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
