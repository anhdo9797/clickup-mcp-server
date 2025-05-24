/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Folder Service
 *
 * Handles all operations related to folders in ClickUp, including:
 * - Creating folders
 * - Retrieving folders
 * - Updating folders
 * - Deleting folders
 * - Finding folders by name
 */

import { AxiosError } from 'axios';
import {
  BaseClickUpService,
  ErrorCode,
  ClickUpServiceError,
  ServiceResponse,
} from './base.js';
import { ClickUpFolder, CreateFolderData } from './types.js';
import { WorkspaceService } from './workspace.js';
import { log, Logger } from '../../logger.js';

const logger: Logger = new Logger('FolderService');
export class FolderService extends BaseClickUpService {
  private workspaceService: WorkspaceService | null = null;

  /**
   * Creates an instance of FolderService
   * @param apiKey - ClickUp API key
   * @param teamId - ClickUp team ID
   * @param baseUrl - Optional custom API URL
   * @param workspaceService - Optional workspace service for lookups
   */
  constructor(
    apiKey: string,
    teamId: string,
    baseUrl?: string,
    workspaceService?: WorkspaceService
  ) {
    super(apiKey, teamId, baseUrl);
    this.workspaceService = workspaceService || null;
  }

  /**
   * Helper method to handle errors consistently
   * @param error The error that occurred
   * @param message Optional custom error message
   * @returns A ClickUpServiceError
   */
  private handleError(error: any, message?: string): ClickUpServiceError {
    if (error instanceof ClickUpServiceError) {
      return error;
    }

    return new ClickUpServiceError(
      message || `Folder service error: ${error.message}`,
      ErrorCode.UNKNOWN,
      error
    );
  }

  /**
   * Create a new folder in a space
   * @param spaceId The ID of the space to create the folder in
   * @param folderData The data for the new folder
   * @returns The created folder
   */
  async createFolder(
    spaceId: string,
    folderData: CreateFolderData
  ): Promise<ClickUpFolder> {
    try {
      this.logOperation('createFolder', { spaceId, ...folderData });

      const response = await this.client.post<ClickUpFolder>(
        `/space/${spaceId}/folder`,
        folderData
      );

      return response.data;
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to create folder in space ${spaceId}`
      );
    }
  }

  /**
   * Get a folder by its ID
   * @param folderId The ID of the folder to retrieve
   * @returns The folder details
   */
  async getFolder(folderId: string): Promise<ClickUpFolder> {
    try {
      this.logOperation('getFolder', { folderId });

      const response = await this.client.get<ClickUpFolder>(
        `/folder/${folderId}`
      );

      console.log("getfolder", response.data);
      

      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to get folder ${folderId}`);
    }
  }

  /**
   * Update an existing folder
   * @param folderId The ID of the folder to update
   * @param updateData The data to update on the folder
   * @returns The updated folder
   */
  async updateFolder(
    folderId: string,
    updateData: Partial<CreateFolderData>
  ): Promise<ClickUpFolder> {
    try {
      this.logOperation('updateFolder', { folderId, ...updateData });

      const response = await this.client.put<ClickUpFolder>(
        `/folder/${folderId}`,
        updateData
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to update folder ${folderId}`);
    }
  }

  /**
   * Delete a folder
   * @param folderId The ID of the folder to delete
   * @returns Success indicator
   */
  async deleteFolder(folderId: string): Promise<ServiceResponse<void>> {
    try {
      this.logOperation('deleteFolder', { folderId });

      await this.client.delete(`/folder/${folderId}`);

      return {
        success: true,
      };
    } catch (error) {
      throw this.handleError(error, `Failed to delete folder ${folderId}`);
    }
  }

  /**
   * Get all folders in a space
   * @param spaceId The ID of the space to get folders from
   * @returns Array of folders in the space
   */
  async getFoldersInSpace(spaceId: string): Promise<ClickUpFolder[]> {
    this.logOperation('getFoldersInSpace', { spaceId });

    try {
      const response = await this.client.get<{ folders: ClickUpFolder[] }>(
        `/space/${spaceId}/folder`
      );
      return response.data.folders;
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to get folders in space ${spaceId}`
      );
    }
  }

  /**
   * Find a folder by its name in a space
   * @param spaceId The ID of the space to search in
   * @param folderName The name of the folder to find
   * @returns The folder if found, otherwise null
   */
  async findFolderByName(
    spaceId: string,
    folderName: string
  ): Promise<ClickUpFolder | null> {
    this.logOperation('findFolderByName', { spaceId, folderName });

    try {
      const folders = await this.getFoldersInSpace(spaceId);
      const matchingFolder = folders.find(
        (folder) => folder.name.toLowerCase() === folderName.toLowerCase()
      );

      return matchingFolder || null;
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to find folder by name in space ${spaceId}`
      );
    }
  }
}
