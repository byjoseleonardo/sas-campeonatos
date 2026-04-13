-- Simplificar configuración de jugadores:
-- Se elimina titulares, suplentes y minSuplentes.
-- Se agrega minJugadores (con default temporal para rows existentes).
-- maxInscripciones ya existía.

-- 1. Agregar columna con default temporal para poder insertar en rows existentes
ALTER TABLE "championships" ADD COLUMN "minJugadores" INTEGER NOT NULL DEFAULT 8;

-- 2. Quitar el default (el organizador define el valor al crear/editar)
ALTER TABLE "championships" ALTER COLUMN "minJugadores" DROP DEFAULT;

-- 3. Eliminar columnas antiguas
ALTER TABLE "championships" DROP COLUMN "titulares";
ALTER TABLE "championships" DROP COLUMN "suplentes";
ALTER TABLE "championships" DROP COLUMN "minSuplentes";
