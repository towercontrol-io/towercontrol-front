import type { CustomField } from './users';

/**
 * Mandatory field definition for capture endpoints
 */
export interface MandatoryField {
  /**
   * Name to be given to the field
   */
  name: string;

  /**
   * Type of value expected in the field
   * Examples:
   * - "string" or "string,^http[s]://"
   * - "number" or "number,0,100"
   * - "decimal" or "decimal,0.0,100.0"
   * - "boolean"
   * - "date"
   * - "enum[red|green|blue]" or "enum[red|green|blue],multiple"
   */
  valueType: string;

  /**
   * Slug to describe the purpose of this field, used for i18n
   */
  description: string;

  /**
   * Short English description (non i18n) for quick understanding
   */
  enDescription: string;
}

/**
 * Capture protocol response
 * Equivalent TypeScript interface for the Java class CaptureProtocolResponseItf
 */
export interface CaptureProtocolResponseItf {
  /**
   * Protocol unique identifier
   * Example: ""
   */
  id: string;

  /**
   * Protocol version
   * Example: 1
   */
  version: number;

  /**
   * Protocol family
   * Example: "protocol-lorawan"
   */
  protocolFamily: string;

  /**
   * Protocol type
   * Example: "protocol-type-helium"
   */
  protocolType: string;

  /**
   * Protocol type stack version
   * Example: "protocol-version-legacy"
   */
  protocolVersion: string;

  /**
   * Protocol slug description
   * Example: "protocol-slug..."
   */
  description: string;

  /**
   * Protocol plaintext English description
   * Example: "LoRaWAN Helium legacy protocol"
   */
  enDescription: string;

  /**
   * Definition of the mandatory fields to setup a capture endpoint with this protocol
   */
  mandatoryFields: MandatoryField[];

  /**
   * This protocol is wide open by default (no ownership right required to send data)
   * Example: false
   */
  defaultWideOpen: boolean;
}

/**
 * Capture endpoint creation body
 * Equivalent TypeScript interface for the Java class CaptureEndpointCreationBody
 */
export interface CaptureEndpointCreationBody {
  /**
   * User defined name for the endpoint to create
   * Example: "My HeyIoT endpoint"
   */
  name: string;

  /**
   * User defined description for the endpoint to create
   * Example: "Where I get my temperature data"
   */
  description: string;

  /**
   * This will force encryption for the payload data at rest
   * Example: false
   */
  encrypted: boolean;

  /**
   * Id of the protocol to be used for this endpoint
   * Example: "Axdsf7Gh"
   */
  protocolId: string;

  /**
   * Force the wide Open value (override of the default protocol value) :
   * Not only endpoint owner can report data to this endpoint. Manipulate carefully. Valid JWT still required.
   * Example: false
   */
  forceWideOpen: boolean;

  /**
   * List of protocol specific fields to be provided for configuration
   */
  customConfig: CustomField[];
}

/**
 * Capture endpoint response
 * Equivalent TypeScript interface for the Java class CaptureEndpointResponseItf
 */
export interface CaptureEndpointResponseItf {
  /**
   * Endpoint unique identifier
   * Example: ""
   */
  id: string;

  /**
   * User defined name for the endpoint
   * Example: "My HeyIoT endpoint"
   */
  name: string;

  /**
   * User defined description for the endpoint to create
   * Example: "Where I get my temperature data"
   */
  description: string;

  /**
   * Endpoint short Id (unique)
   * Example: "Azh55hjq"
   */
  ref: string;

  /**
   * Endpoint owner Id
   * Example: "3C152025461561D51A351..."
   */
  owner: string;

  /**
   * For endpoints with source non restricted to a specific owner, this reduce the security by allowing any valid JWT
   * to post data to this endpoint instead of owner's one
   * Example: false
   */
  wideOpen: boolean;

  /**
   * This will force encryption for the payload data at rest
   * Example: false
   */
  encrypted: boolean;

  /**
   * Date / time of creation of the endpoint in milliseconds since epoch
   * Example: 1672531199000
   */
  creationMs: number;

  /**
   * Id of the protocol to be used for this endpoint
   * Example: "Axdsf7Gh"
   */
  protocolId: string;

  /**
   * List of protocol specific fields to be provided for configuration
   */
  customConfig: CustomField[];

  /**
   * Stats - total frame received
   * Example: 1250
   */
  totalFramesReceived: number;

  /**
   * Stats - total frame accepted to pivot
   * Example: 1250
   */
  totalFramesAcceptedToPivot: number;

  /**
   * Stats - total frame accepted in a driver to pivot
   * Example: 1250
   */
  totalInDriver: number;

  /**
   * Stats - total frame accepted to process
   * Example: 1250
   */
  totalFramesAcceptedToProcess: number;

  /**
   * Stats - total frame refused due to user restrictions
   * Example: 1250
   */
  totalBadOwnerRefused: number;

  /**
   * Stats - total frame refused due payload format issues
   * Example: 1250
   */
  totalBadPayloadFormat: number;

  /**
   * Stats - total frame refused due device ritgh issues
   * Example: 1250
   */
  totalBadDeviceRight: number;

  /**
   * Stats - current frame in queue to process
   * Example: 1250
   */
  totalQueuedToProcess: number;
}

