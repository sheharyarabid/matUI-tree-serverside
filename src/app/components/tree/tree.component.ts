import { Component, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CdkTreeModule } from '@angular/cdk/tree';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

export class TodoItemNode {
  children: TodoItemNode[] = [];
  item: string = '';
  id?: number; // Ensure ID is included
  expandable: boolean = false; // Add the 'expandable' property
  parent?: number; 
}

export class TodoItemFlatNode {
  item: string = '';
  level: number = 0;
  expandable: boolean = false;
  id?: number; // Ensure ID is included
}
const apiUrl = 'http://localhost:1337/api/tree';
@Injectable()
export class ChecklistDatabase {

  dataChange = new BehaviorSubject<TodoItemNode[]>([]);

  constructor(private http: HttpClient) {
    this.initialize();
  }

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  initialize() {
    this.http.get<any>(`${apiUrl}/get`).subscribe(
      (response: any) => {
        try {
          const data = this.mapNodes(response);
          this.dataChange.next(data);
        } catch (error) {
          console.error('Error processing data:', error);
          this.dataChange.next([]);
        }
      },
      error => {
        console.error('Error fetching data:', error);
        this.dataChange.next([]);
      }
    );
  }

  mapNodes(nodes: any[]): TodoItemNode[] {
    const convertToTodoItemNode = (node: any): TodoItemNode => {
      const todoItemNode = new TodoItemNode();
      todoItemNode.item = node.node;
      todoItemNode.id = node.id; // Ensure ID is correctly mapped
      todoItemNode.children = (node.children || []).map(convertToTodoItemNode);
      return todoItemNode;
    };

    return nodes.map(convertToTodoItemNode);
  }
}

@Component({
  selector: 'app-tree',
  templateUrl: 'tree.component.html',
  styleUrls: ['tree.component.scss'],
  providers: [ChecklistDatabase],
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatTreeModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    CdkTreeModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule
  ],
})
export class TreeComponent {
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();
  selectedParent: TodoItemFlatNode | null = null;
  nodeInput: { [key: string]: string } = {}; // Store input values for each node
  treeControl: FlatTreeControl<TodoItemFlatNode>;
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);
  editingNode: TodoItemFlatNode | null = null;
  selectedNode: TodoItemFlatNode | null = null;
  isInputFieldVisible: boolean = false;
  availableIds: number[] = [];

  toggleInputField() {
    this.isInputFieldVisible = !this.isInputFieldVisible;
  }

  loadAvailableIds() {
    // Replace with your actual API endpoint to fetch available IDs
    this.http.get<number[]>(`${apiUrl}/ids`).subscribe(
      (ids: number[]) => {
        this.availableIds = ids;
      },
      error => {
        console.error('Error fetching available IDs:', error);
      }
    );
  }

  constructor(private _database: ChecklistDatabase, private http: HttpClient) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
      this.initializeNodeInputs(data); // Initialize input values when data changes
    });
  }

  initialize() {
    this.dataSource.data = [...this.dataSource.data];
    this._database.dataChange.next(this.dataSource.data);
    this.loadAvailableIds(); 
  }

  selectNode(node: TodoItemFlatNode) {
    this.selectedNode = node;
  }

  getLevel = (node: TodoItemFlatNode) => node.level;

  isExpandable = (node: TodoItemFlatNode) => node.expandable;

  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    flatNode.id = node.id; // Map ID to flat node
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  toggle(toggle: boolean) {
    return toggle;
  }

  saveNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    const parent = flatNode;
    const parentId = parent?.id;
    const newValue = this.nodeInput[node.item] || ''; // Use the input value

    const payload = {
      node: newValue,
      parent: parentId
    };

    this.http.post(`${apiUrl}/create`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        console.log('Node saved successfully:', response);
        const newNode: TodoItemNode = {
          item: newValue,
          id: response.id, // Assuming the response returns the new node ID
          children: [],
          expandable: false
        };

        // Update the tree data
        this.addNodeToTree(parentId, newNode);
        this.nodeInput[node.item] = ''; // Clear the input field after saving
      },
      error => {
        console.error('Error saving node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }

  addNodeToTree(parentId: number | undefined, newNode: TodoItemNode) {
    const updateChildren = (nodes: TodoItemNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === parentId) {
          node.children.push(newNode);
          // Ensure the parent node is marked as expandable
          node.expandable = true;
          this.dataSource.data = [...this.dataSource.data]; // Trigger update
          this.treeControl.expand(this.treeControl.dataNodes.find(n => n.id === parentId) || this.treeControl.dataNodes[0]);
          return true;
        }
        if (updateChildren(node.children)) {
          return true;
        }
      }
      return false;
    };

    // Update tree data
    updateChildren(this._database.data);
  }

  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  // Initialize node input values
  initializeNodeInputs(nodes: TodoItemNode[]) {
    const traverseNodes = (node: TodoItemNode) => {
      this.nodeInput[node.item] = ''; // Initialize input for each node
      node.children.forEach(traverseNodes);
    };

    nodes.forEach(traverseNodes);
  }

  deleteNode(nodeId: TodoItemFlatNode) {
    this.http.delete(`${apiUrl}/delete/${nodeId}`).subscribe(
      (response: any) => {
        console.log('Node deleted successfully:', response);
        this.removeNodeFromTree(nodeId);
      },
      error => {
        console.error('Error deleting node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }

  removeNodeFromTree(nodeId: TodoItemFlatNode  ) {
    const removeNode = (nodes: TodoItemNode[]): boolean => {
      for (const node of nodes) {
        const index = node.children.findIndex(child => child.id === Number(nodeId));
        if (index !== -1) {
          node.children.splice(index, 1);
          if (node.children.length === 0) {
            node.expandable = false;
          }
          this.dataSource.data = [...this.dataSource.data]; // Trigger update
          return true;
        }
        if (removeNode(node.children)) {
          return true;
        }
      }
      return false;
    };

    // Update tree data
    removeNode(this._database.data);
  }

  editNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    if (!flatNode) {
      console.error('FlatNode not found');
      return;
    }
  
    const parentId = this.nodeInput[node.id || ''];
    const newValue = this.nodeInput[node.item] || '';
  
    // Ensure that the node ID and parent ID are defined
    if (!node.id || parentId === undefined) {
      console.error('Node ID or Parent ID is not defined');
      return;
    }
  
    const payload = {
      node: newValue,
      parent: parentId
    };
  
    this.http.patch(`${apiUrl}/update/${node.id}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        const nodeid = !node.id;
        console.log('Node updated successfully:', response);
        
        this.initialize();
        this.nodeInput[node?.item] = ''; // Clear the input field after saving
        if (node.id) {
          this.nodeInput[node.id] = ''; // Clear the parent input field after saving
        }
        this._database.initialize();
      },
      error => {
        console.log(payload.node);
        console.log(payload.parent);
        console.error('Error updating node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }
  // this._database.dataChange.next(this.dataSource.data);

  
}