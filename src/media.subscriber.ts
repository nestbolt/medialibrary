import "reflect-metadata";
import {
  EventSubscriber,
  EntitySubscriberInterface,
  RemoveEvent,
  DataSource,
} from "typeorm";
import { HAS_MEDIA_METADATA_KEY } from "./media.constants";
import { MediaService } from "./media.service";

@EventSubscriber()
export class MediaSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  afterRemove(event: RemoveEvent<any>): void | Promise<void> {
    if (!event.entity) return;

    const meta = Reflect.getMetadata(HAS_MEDIA_METADATA_KEY, event.entity.constructor);
    if (!meta) return;

    const service = MediaService.getInstance();
    if (!service) return;

    const modelType = meta.modelType ?? event.entity.constructor.name;
    const modelId = String(event.entity.id);

    if (!modelId) return;

    return service.deleteAllMedia(modelType, modelId);
  }
}
